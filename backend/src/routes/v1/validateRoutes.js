const express = require('express');
const { validateDocument, validateDocuments } = require('../../controllers/validateController');
const { defaultLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

router.post('/document', defaultLimiter, validateDocument);

router.post('/documents', defaultLimiter, validateDocuments);

module.exports = router;