const express = require('express');
const { validateOCRData } = require('../../controllers/validateController');

const router = express.Router();

/**
 * Validate extracted OCR data against user provided information
 * @route   POST /api/v1/validate
 * @body    {number} documentId - Document ID
 * @body    {Object} userData - User provided information
 * @body    {Object} ocrData - Extracted OCR data
 * @access  Public
 */
router.post('/', validateOCRData);

module.exports = router;
