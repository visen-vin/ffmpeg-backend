const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {
  ensureSessionDirs,
  getSessionDir,
  getInputDir,
  getOutputDir,
} = require('../utils/sessionPaths');

async function createSession(req, res) {
  const sessionId = uuidv4();
  ensureSessionDirs(sessionId);
  const metaPath = path.join(getSessionDir(sessionId), 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify({ sessionId, createdAt: new Date().toISOString() }));
  return res.status(201).json({ sessionId });
}

async function uploadFile(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  return res.json({ fileName: req.file.originalname, message: 'File uploaded successfully to session.' });
}

async function downloadFile(req, res) {
  const { sessionId, filename } = req.params;
  const filePath = path.join(getOutputDir(sessionId), filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(path.resolve(filePath));
}

async function deleteSession(req, res) {
  const { sessionId } = req.params;
  const dir = getSessionDir(sessionId);
  fs.rmSync(dir, { recursive: true, force: true });
  return res.json({ message: 'Session and all its files have been deleted.' });
}

module.exports = {
  createSession,
  uploadFile,
  downloadFile,
  deleteSession,
};