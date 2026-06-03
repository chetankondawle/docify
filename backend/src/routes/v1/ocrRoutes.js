const express = require('express');
const {
  extractOCR,
  extractStructured,
  batchExtractOCR,
} = require('../../controllers/ocrController');

const router = express.Router();

// Extract OCR from a single document
router.post('/extract/:id', extractOCR);

// Extract structured data from a document
router.post('/structured/:id', extractStructured);

// Batch extract OCR from multiple documents
router.post('/batch', batchExtractOCR);

module.exports = router;
