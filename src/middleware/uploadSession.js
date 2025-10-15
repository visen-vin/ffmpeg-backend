const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getInputDir } = require('../utils/sessionPaths');

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const { sessionId } = req.params;
    const dest = getInputDir(sessionId);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}${ext}`);
  },
});

module.exports = multer({ storage });