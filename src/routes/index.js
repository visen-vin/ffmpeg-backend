const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'FFmpeg backend API' });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount v1 routers

// New session and jobs routes (session-based API)
const sessionsRouter = require('./v1/sessions');
router.use('/v1/sessions', sessionsRouter);
const jobsRouter = require('./v1/jobs');
router.use('/v1/jobs', jobsRouter);

module.exports = router;