const path = require('path');
const fs = require('fs');

const STORAGE_ROOT = path.resolve('storage');

function getSessionDir(sessionId) {
  return path.join(STORAGE_ROOT, 'sessions', sessionId);
}

function getInputDir(sessionId) {
  return path.join(getSessionDir(sessionId), 'input');
}

function getOutputDir(sessionId) {
  return path.join(getSessionDir(sessionId), 'output');
}

function ensureSessionDirs(sessionId) {
  const dir = getSessionDir(sessionId);
  const input = getInputDir(sessionId);
  const output = getOutputDir(sessionId);
  [dir, input, output].forEach((p) => {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });
}

module.exports = {
  STORAGE_ROOT,
  getSessionDir,
  getInputDir,
  getOutputDir,
  ensureSessionDirs,
};