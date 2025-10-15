const express = require('express');
const router = express.Router();
const controller = require('../../controllers/jobController');

router.post('/ffmpeg', express.json(), controller.queueFFmpeg);

module.exports = router;