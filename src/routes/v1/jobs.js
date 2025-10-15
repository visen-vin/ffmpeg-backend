const express = require('express');
const router = express.Router();
const jobStatus = require('../../controllers/jobStatusController');

router.get('/:jobId', jobStatus.getJobStatus);

module.exports = router;