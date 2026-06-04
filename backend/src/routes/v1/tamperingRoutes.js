const express = require('express');
const { checkPDFTampering, checkImageTampering } = require('../../controllers/tamperingController');
const { ocrLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

router.post('/check/:id', ocrLimiter, checkPDFTampering);

router.post('/check-image/:id', ocrLimiter, checkImageTampering);

module.exports = router;