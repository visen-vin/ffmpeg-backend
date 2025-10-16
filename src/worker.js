const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const State = require('../services/StateService');
const FF = require('./services/FFmpegService');

const SESSIONS_ROOT = path.join(State.STORAGE_ROOT, 'sessions');

async function listJobs() {
  try {
    const sessions = await fsp.readdir(SESSIONS_ROOT).catch(() => []);
    const entries = [];
    for (const sid of sessions) {
      const qdir = path.join(SESSIONS_ROOT, sid, 'queue');
      const files = await fsp.readdir(qdir).catch(() => []);
      for (const f of files.filter((x) => x.endsWith('.json'))) {
        const p = path.join(qdir, f);
        const stat = await fsp.stat(p).catch(() => null);
        if (stat) entries.push({ name: f, path: p, stat });
      }
    }
    entries.sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs);
    return entries;
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
  let { args, cwd } = data;
  if (!args && data.operation) {
    const op = data.operation;
    try {
      if (op === 'image-to-video') args = FF.imageToVideoArgs(data.sessionId, data.params, data.outputFilename);
      if (op === 'add-audio') args = FF.addAudioArgs(data.sessionId, data.params, data.outputFilename);
      if (op === 'apply-effects') args = FF.applyEffectsArgs(data.sessionId, data.params, data.outputFilename);
      if (op === 'add-text-overlay') args = await FF.addTextOverlayArgs(data.sessionId, data.params, data.outputFilename);
    } catch (error) {
      console.error(`Error generating args for operation ${op}:`, error);
      // Mark job as failed and clean up
      const finishedAt = new Date().toISOString();
      const out = {
        ...data,
        args: [],
        startedAt,
        finishedAt,
        status: 'failed',
        code: 1,
        logs: [`Error generating FFmpeg arguments: ${error.message}`],
      };
      const sessionDir = path.dirname(path.dirname(lockPath));
      const destDir = path.join(sessionDir, 'failed');
      await State.ensureDir(destDir);
      const destPath = path.join(destDir, path.basename(job.path));
      await State.writeJSONAtomic(destPath, out);
      await fsp.unlink(lockPath).catch(() => {});
      return;
    }
  }

  console.log(`Generated args for ${data.operation}:`, args);
  
  if (!args || args.length === 0) {
    console.error(`No args generated for operation ${data.operation}`);
    const finishedAt = new Date().toISOString();
    const out = {
      ...data,
      args: [],
      startedAt,
      finishedAt,
      status: 'failed',
      code: 1,
      logs: [`No FFmpeg arguments generated for operation ${data.operation}`],
    };
    const sessionDir = path.dirname(path.dirname(lockPath));
    const destDir = path.join(sessionDir, 'failed');
    await State.ensureDir(destDir);
    const destPath = path.join(destDir, path.basename(job.path));
    await State.writeJSONAtomic(destPath, out);
    await fsp.unlink(lockPath).catch(() => {});
    return;
  }

  const onProgress = (progress) => {
    const progressData = { ...data, status: 'processing', progress };
    State.writeJSONAtomic(lockPath, progressData).catch(() => {});
  };

  const result = await FF.runFFmpegCommand(args, { cwd, job: data }, onProgress);
  const finishedAt = new Date().toISOString();
  const out = {
    ...data,
    args,
    startedAt,
    finishedAt,
    status: result.success ? 'completed' : 'failed',
    code: result.code,
    logs: result.logs,
  };

  const sessionDir = path.dirname(path.dirname(lockPath));
  const destDir = path.join(sessionDir, result.success ? 'completed' : 'failed');
  await State.ensureDir(destDir);
  const destPath = path.join(destDir, path.basename(job.path));
  await State.writeJSONAtomic(destPath, out);
  await fsp.unlink(lockPath).catch(() => {});
}

async function loop() {
  await State.ensureDir(SESSIONS_ROOT);
  setInterval(processNext, 2000);
}

loop();