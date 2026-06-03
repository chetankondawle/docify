const express = require('express');
const { checkPDFTampering } = require('../../controllers/tamperingController');

const router = express.Router();

// Check PDF for tampering
router.post('/check/:id', checkPDFTampering);

module.exports = router;
