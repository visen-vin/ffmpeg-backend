const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const State = require('../services/StateService');
const { runFFmpegCommand } = require('./services/FFmpegService');

const QUEUE_DIR = path.join(State.STORAGE_ROOT, 'queue');
const COMPLETED_DIR = path.join(State.STORAGE_ROOT, 'completed');
const FAILED_DIR = path.join(State.STORAGE_ROOT, 'failed');

async function listJobs() {
  try {
    const files = await fsp.readdir(QUEUE_DIR);
    const jsons = files.filter((f) => f.endsWith('.json'));
    const stats = await Promise.all(jsons.map(async (f) => ({
      name: f,
      path: path.join(QUEUE_DIR, f),
      stat: await fsp.stat(path.join(QUEUE_DIR, f)),
    })));
    stats.sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs);
    return stats;
  } catch {
    return [];
  }
}

async function processNext() {
  const jobs = await listJobs();
  if (!jobs.length) return;
  const job = jobs[0];
  const lockPath = job.path.replace(/\.json$/, '.processing');
  try {
    await fsp.rename(job.path, lockPath);
  } catch {
    return; // already taken
  }

  let data;
  try {
    data = JSON.parse((await fsp.readFile(lockPath)).toString());
  } catch (err) {
    await fsp.unlink(lockPath).catch(() => {});
    return;
  }

  const startedAt = new Date().toISOString();
  const { args = [], cwd } = data;
  const result = await runFFmpegCommand(args, { cwd });
  const finishedAt = new Date().toISOString();
  const out = {
    ...data,
    startedAt,
    finishedAt,
    status: result.success ? 'completed' : 'failed',
    code: result.code,
    logs: result.logs,
  };

  const destDir = result.success ? COMPLETED_DIR : FAILED_DIR;
  const destPath = path.join(destDir, path.basename(job.path));
  await State.writeJSONAtomic(destPath, out);
  await fsp.unlink(lockPath).catch(() => {});
}

async function loop() {
  await State.ensureDir(QUEUE_DIR);
  await State.ensureDir(COMPLETED_DIR);
  await State.ensureDir(FAILED_DIR);
  setInterval(processNext, 2000);
}

loop();