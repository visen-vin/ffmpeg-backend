const path = require('path');
const { v4: uuidv4 } = require('uuid');
const State = require('../../services/StateService');
const { getProcessDir } = require('../utils/processPaths');

async function queueFFmpeg(req, res) {
  const { processId, args } = req.body || {};
  if (!Array.isArray(args) || !args.length) {
    return res.status(400).json({ error: 'args array is required' });
  }
  const jobId = uuidv4();
  const job = {
    jobId,
    type: 'ffmpeg',
    status: 'queued',
    createdAt: new Date().toISOString(),
    args,
    cwd: processId ? getProcessDir(processId) : undefined,
    processId,
  };
  const jobPath = path.join(State.STORAGE_ROOT, 'queue', `${jobId}.json`);
  await State.writeJSONAtomic(jobPath, job);
  res.status(202).json({ jobId, status: 'queued' });
}

module.exports = { queueFFmpeg };