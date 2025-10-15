const fs = require('fs');
const path = require('path');
const { STORAGE_ROOT } = require('../utils/sessionPaths');

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p)); } catch { return null; }
}

function getJobStatus(req, res) {
  const { jobId } = req.params;
  const sessionsRoot = path.join(STORAGE_ROOT, 'sessions');
  const sessions = fs.existsSync(sessionsRoot) ? fs.readdirSync(sessionsRoot) : [];
  for (const sid of sessions) {
    const base = path.join(sessionsRoot, sid);
    const q = path.join(base, 'queue', `${jobId}.json`);
    const c = path.join(base, 'completed', `${jobId}.json`);
    const f = path.join(base, 'failed', `${jobId}.json`);
    if (fs.existsSync(c)) return res.json(readJSON(c));
    if (fs.existsSync(f)) return res.json(readJSON(f));
    if (fs.existsSync(q)) return res.json(readJSON(q));
  }
  return res.status(404).json({ error: 'Job not found' });
}

module.exports = { getJobStatus };