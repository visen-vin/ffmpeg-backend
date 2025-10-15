const fs = require('fs');
const multer = require('multer');
const { getInputDir } = require('../utils/processPaths');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const dest = getInputDir(req.params.processId);
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const uploadAny = multer({ storage }).any();

module.exports = uploadAny;