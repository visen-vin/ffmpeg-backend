const express = require('express');
const router = express.Router();
const checkSessionExists = require('../../middleware/checkSessionExists');
const checkSessionExistsBody = require('../../middleware/checkSessionExistsBody');
const uploadSession = require('../../middleware/uploadSession');
const sessionController = require('../../controllers/sessionController');
const ops = require('../../controllers/sessionOpsController');

router.post('/create', sessionController.createSession);
router.post('/:sessionId/upload', checkSessionExists, uploadSession.single('file'), sessionController.uploadFile);
router.get('/:sessionId/download/:filename', checkSessionExists, sessionController.downloadFile);
router.delete('/:sessionId', checkSessionExists, sessionController.deleteSession);

// Operations: sessionId is provided in the request body only; URLs have no :sessionId
router.post('/image-to-video', checkSessionExistsBody, ops.imageToVideo);
router.post('/add-audio', checkSessionExistsBody, ops.addAudio);
router.post('/apply-effects', checkSessionExistsBody, ops.applyEffects);
router.post('/add-text-overlay', checkSessionExistsBody, ops.addTextOverlay);

module.exports = router;