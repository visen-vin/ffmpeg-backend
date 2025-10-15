const fs = require('fs');
const { getSessionDir } = require('../utils/sessionPaths');

module.exports = function checkSessionExists(req, res, next) {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  const dir = getSessionDir(sessionId);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Session not found' });
  next();
};