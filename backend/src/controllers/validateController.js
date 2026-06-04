const { sendSuccess, sendError, sendBadRequest } = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');
const { validateSingleDocument, validateMultipleDocuments } = require('../services/validationService');

/**
 * Validate single document OCR data against user information
 * @route   POST /api/v1/validate/document
 * @access  Public
 */
const validateDocument = asyncHandler(async (req, res) => {
  const { documentId, documentType, extractedData, userData } = req.body;

  if (!documentId || !documentType || !extractedData || !userData) {
    return sendBadRequest(res, 'Missing required fields: documentId, documentType, extractedData, userData');
  }

  try {
    logger.info(`Validating ${documentType} document ID: ${documentId}`);

    const validation = validateSingleDocument(extractedData, documentType, userData);

    sendSuccess(res, validation, 'Document validation completed');
  } catch (error) {
    logger.error(`Document validation failed: ${error.message}`);
    return sendError(res, error.message, 400);
  }
});

/**
 * Validate multiple documents for data consistency
 * @route   POST /api/v1/validate/documents
 * @access  Public
 */
const validateDocuments = asyncHandler(async (req, res) => {
  const { documents, userData } = req.body;

  if (!documents || !Array.isArray(documents) || documents.length === 0 || !userData) {
    return sendBadRequest(res, 'Missing required fields: documents (array), userData');
  }

  try {
    logger.info(`Validating ${documents.length} documents for consistency`);

    const documentsData = {};
    documents.forEach(doc => {
      documentsData[doc.documentId] = {
        documentType: doc.documentType,
        extractedData: doc.extractedData,
      };
    });

    const validation = validateMultipleDocuments(documentsData, userData);

    sendSuccess(res, validation, 'Multi-document validation completed');
  } catch (error) {
    logger.error(`Multi-document validation failed: ${error.message}`);
    return sendError(res, error.message, 400);
  }
});

module.exports = {
  validateDocument,
  validateDocuments,
};
