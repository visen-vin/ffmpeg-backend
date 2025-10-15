const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const StateService = require('../../services/StateService');
const { getProcessDir, getInputDir, getOutputDir } = require('../utils/processPaths');

async function create(req, res) {
  try {
    const processId = uuidv4();
    await StateService.ensureDir(getProcessDir(processId));
    await StateService.ensureDir(getInputDir(processId));
    await StateService.ensureDir(getOutputDir(processId));

    const metaPath = path.join(getProcessDir(processId), 'meta.json');
    await StateService.writeJSONAtomic(metaPath, {
      processId,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ processId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create process' });
  }
}

async function handleUpload(req, res) {
  const files = (req.files || []).map((f) => ({
    fieldname: f.fieldname,
    originalname: f.originalname,
    filename: f.filename,
    size: f.size,
  }));
  try {
    const manifestPath = path.join(getProcessDir(req.params.processId), 'uploads.json');
    const prev = await StateService.readJSON(manifestPath, { files: [] });
    await StateService.writeJSONAtomic(manifestPath, { files: [...prev.files, ...files] });
  } catch (_) {}
  res.status(200).json({ uploaded: files.length, files });
}

async function download(req, res) {
  const filePath = path.join(getOutputDir(req.params.processId), req.params.filename);
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    res.download(filePath);
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
}

async function remove(req, res) {
  try {
    await fsp.rm(getProcessDir(req.params.processId), { recursive: true, force: true });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete process directory' });
  }
}

module.exports = { create, handleUpload, download, remove };