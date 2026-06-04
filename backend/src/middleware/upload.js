const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

const MAX_FILE_SIZE = config.upload.maxFileSize;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file || !file.mimetype) {
    return cb(new Error('File or MIME type is missing'), false);
  }

  const allowedExtensions = ALLOWED_TYPES[file.mimetype];
  if (!allowedExtensions) {
    return cb(
      new Error(`Unsupported file type "${file.mimetype}". Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}`),
      false
    );
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`File extension "${ext}" does not match MIME type "${file.mimetype}"`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = upload;