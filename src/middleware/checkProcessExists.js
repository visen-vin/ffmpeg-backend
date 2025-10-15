const fs = require('fs');
const fsp = fs.promises;
const { getProcessDir } = require('../utils/processPaths');

async function checkProcessExists(req, res, next) {
  const { processId } = req.params;
  try {
    const dir = getProcessDir(processId);
    await fsp.access(dir, fs.constants.F_OK);
    next();
  } catch (err) {
    res.status(404).json({ error: 'Process not found' });
  }
}

module.exports = checkProcessExists;