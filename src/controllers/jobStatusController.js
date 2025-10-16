const fs = require('fs');
const path = require('path');
const { STORAGE_ROOT } = require('../utils/sessionPaths');

function readJSON(p) {
  try { 
    const content = fs.readFileSync(p, 'utf8');
    // Parse JSON first, then return a clean version without logs for jq compatibility
    const data = JSON.parse(content);
    
    // Return a clean version without the problematic logs array
    const cleanData = {
      jobId: data.jobId,
      sessionId: data.sessionId,
      operation: data.operation,
      params: data.params,
      outputFilename: data.outputFilename,
      status: data.status,
      createdAt: data.createdAt,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
      code: data.code
    };
    
    return cleanData;
  } catch { 
    return null; 
  }
}

function getJobStatus(req, res) {
  const { jobId } = req.params;
  const sessionsRoot = path.join(STORAGE_ROOT, 'sessions');
  const sessions = fs.existsSync(sessionsRoot) ? fs.readdirSync(sessionsRoot) : [];
  for (const sid of sessions) {
    const base = path.join(sessionsRoot, sid);
    const q = path.join(base, 'queue', `${jobId}.json`);
    const p = path.join(base, 'queue', `${jobId}.processing`);
    const c = path.join(base, 'completed', `${jobId}.json`);
    const f = path.join(base, 'failed', `${jobId}.json`);
    if (fs.existsSync(c)) {
      const data = readJSON(c);
      return data ? res.json(data) : res.status(500).json({ error: 'Failed to read job data' });
    }
    if (fs.existsSync(f)) {
      const data = readJSON(f);
      return data ? res.json(data) : res.status(500).json({ error: 'Failed to read job data' });
    }
    if (fs.existsSync(p)) {
      const data = readJSON(p);
      return data ? res.json(data) : res.status(500).json({ error: 'Failed to read job data' });
    }
    if (fs.existsSync(q)) {
      const data = readJSON(q);
      return data ? res.json(data) : res.status(500).json({ error: 'Failed to read job data' });
    }
  }
  return res.status(404).json({ error: 'Job not found' });
}

module.exports = { getJobStatus };