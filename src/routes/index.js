const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'FFmpeg backend API' });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount v1 routers
const processRouter = require('./v1/process');
router.use('/v1/process', processRouter);
const jobRouter = require('./v1/job');
router.use('/v1/job', jobRouter);

module.exports = router;