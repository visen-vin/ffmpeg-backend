const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const STORAGE_ROOT = path.resolve(process.cwd(), 'storage');

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function atomicWrite(filePath, content) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  const tmpPath = `${filePath}.tmp`;
  await fsp.writeFile(tmpPath, content);
  await fsp.rename(tmpPath, filePath);
}

async function writeJSONAtomic(filePath, data) {
  const serialized = JSON.stringify(data, null, 2);
  await atomicWrite(filePath, serialized);
}

async function readJSON(filePath, defaultValue = {}) {
  try {
    const buf = await fsp.readFile(filePath);
    return JSON.parse(buf.toString());
  } catch (err) {
    if (err.code === 'ENOENT') return defaultValue;
    throw err;
  }
}

function getStoragePath(...segments) {
  return path.join(STORAGE_ROOT, ...segments);
}

async function exists(p) {
  try {
    await fsp.access(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  STORAGE_ROOT,
  ensureDir,
  atomicWrite,
  writeJSONAtomic,
  readJSON,
  getStoragePath,
  exists,
  rename: (oldPath, newPath) => fsp.rename(oldPath, newPath),
};