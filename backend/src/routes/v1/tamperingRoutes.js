const express = require('express');
const { checkPDFTampering, checkImageTampering } = require('../../controllers/tamperingController');

const router = express.Router();

// Check PDF for tampering
router.post('/check/:id', checkPDFTampering);

// Check image for tampering
router.post('/check-image/:id', checkImageTampering);

module.exports = router;
