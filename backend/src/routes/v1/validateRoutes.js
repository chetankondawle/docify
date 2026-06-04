const express = require('express');
const { validateDocument, validateDocuments } = require('../../controllers/validateController');

const router = express.Router();

/**
 * Validate single document OCR data against user information
 * @route   POST /api/v1/validate/document
 * @body    {string} documentId - Document ID
 * @body    {string} documentType - Document type (AADHAAR, PAN, PASSPORT, SALARY_SLIP)
 * @body    {Object} extractedData - Extracted OCR data
 * @body    {Object} userData - User provided information
 * @access  Public
 */
router.post('/document', validateDocument);

/**
 * Validate multiple documents for data consistency
 * @route   POST /api/v1/validate/documents
 * @body    {Array} documents - Array of {documentId, documentType, extractedData}
 * @body    {Object} userData - User provided information
 * @access  Public
 */
router.post('/documents', validateDocuments);

module.exports = router;
