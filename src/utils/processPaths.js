const path = require('path');
const StateService = require('../../services/StateService');

const ROOT = StateService.STORAGE_ROOT;

function getProcessDir(processId) {
  return path.join(ROOT, 'processes', processId);
}

function getInputDir(processId) {
  return path.join(getProcessDir(processId), 'input');
}

function getOutputDir(processId) {
  return path.join(getProcessDir(processId), 'output');
}

module.exports = { ROOT, getProcessDir, getInputDir, getOutputDir };