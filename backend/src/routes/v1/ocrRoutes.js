const express = require('express');
const router = express.Router();
const {
  extractOCR,
  extractStructured,
  getDocumentTypes, // Import the new controller function
  batchExtractOCR
} = require('../../controllers/ocrController');

// Get list of available document types
router.get('/documentTypes', getDocumentTypes); // Add the new route

// Extract OCR from a single document
router.post('/extract/:id', extractOCR);

// Extract structured data based on document type
router.post('/structured/:id', extractStructured);

// Batch OCR extraction
router.post('/batch', batchExtractOCR);

module.exports = router;
