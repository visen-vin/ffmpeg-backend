const fs = require('fs');
const { getSessionDir } = require('../utils/sessionPaths');

module.exports = function checkSessionExistsBody(req, res, next) {
  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId in body' });
  const dir = getSessionDir(sessionId);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Session not found' });
  next();
};