const express = require('express');
const upload = require('../../middleware/upload');
const {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
} = require('../../controllers/documentController');
const { uploadLimiter, defaultLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

router.post('/upload', uploadLimiter, upload.single('document'), uploadDocument);

router.get('/', defaultLimiter, getDocuments);

router.get('/:id', defaultLimiter, getDocument);

router.delete('/:id', defaultLimiter, deleteDocument);

module.exports = router;