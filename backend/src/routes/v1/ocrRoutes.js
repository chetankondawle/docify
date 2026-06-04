const express = require('express');
const router = express.Router();
const {
  extractOCR,
  extractStructured,
  getDocumentTypes,
  batchExtractOCR
} = require('../../controllers/ocrController');
const { ocrLimiter } = require('../../middleware/rateLimiter');

router.get('/documentTypes', getDocumentTypes);

router.post('/extract/:id', ocrLimiter, extractOCR);

router.post('/structured/:id', ocrLimiter, extractStructured);

router.post('/batch', ocrLimiter, batchExtractOCR);

module.exports = router;