const express = require('express');
const upload = require('../../middleware/upload');
const {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
} = require('../../controllers/documentController');

const router = express.Router();

// Upload single document
router.post('/upload', upload.single('document'), uploadDocument);

// Get all documents
router.get('/', getDocuments);

// Get single document
router.get('/:id', getDocument);

// Delete document
router.delete('/:id', deleteDocument);

module.exports = router;
