const { sendSuccess, sendError, sendBadRequest } = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');
const logger = require('../utils/logger');
const { validateSingleDocument, validateMultipleDocuments } = require('../services/validationService');

const validateDocument = asyncHandler(async (req, res) => {
  const { documentId, documentType, extractedData, userData } = req.body;

  const idCheck = validate.documentId(documentId);
  if (!idCheck.valid) return sendBadRequest(res, idCheck.message);

  const typeCheck = validate.documentType(documentType);
  if (!typeCheck.valid) return sendBadRequest(res, typeCheck.message);

  const dataCheck = validate.nonEmptyObject(extractedData, 'extractedData');
  if (!dataCheck.valid) return sendBadRequest(res, dataCheck.message);

  const userCheck = validate.nonEmptyObject(userData, 'userData');
  if (!userCheck.valid) return sendBadRequest(res, userCheck.message);

  try {
    logger.info(`Validating ${documentType} document ID: ${documentId}`);
    const validation = validateSingleDocument(extractedData, documentType, userData);
    sendSuccess(res, validation, 'Document validation completed');
  } catch (error) {
    logger.error(`Document validation failed: ${error.message}`);
    return sendError(res, error.message, 400);
  }
});

const validateDocuments = asyncHandler(async (req, res) => {
  const { documents, userData } = req.body;

  if (!Array.isArray(documents) || documents.length === 0) {
    return sendBadRequest(res, 'documents must be a non-empty array');
  }

  const userCheck = validate.nonEmptyObject(userData, 'userData');
  if (!userCheck.valid) return sendBadRequest(res, userCheck.message);

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    if (!doc.documentId || !doc.documentType || !doc.extractedData) {
      return sendBadRequest(res, `documents[${i}]: missing required fields (documentId, documentType, extractedData)`);
    }
    const idCheck = validate.documentId(doc.documentId);
    if (!idCheck.valid) return sendBadRequest(res, `documents[${i}]: ${idCheck.message}`);
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