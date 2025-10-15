const express = require('express');
const router = express.Router();

const uploadAny = require('../../middleware/upload');
const checkProcessExists = require('../../middleware/checkProcessExists');
const controller = require('../../controllers/processController');

router.post('/create', controller.create);
router.post('/:processId/upload', checkProcessExists, (req, res) => {
  uploadAny(req, res, (err) => {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    controller.handleUpload(req, res);
  });
});
router.get('/:processId/download/:filename', checkProcessExists, controller.download);
router.delete('/:processId', checkProcessExists, controller.remove);

module.exports = router;