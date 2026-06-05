const documentService = require('../services/documentService');
const { deleteFile } = require('../utils/fileHelpers');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendBadRequest } = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');
const logger = require('../utils/logger');

const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendBadRequest(res, 'No file uploaded. Ensure the field is named "document" and is a valid file.');
  }

  const { documentType, userId } = req.body;

  if (documentType) {
    const typeCheck = validate.documentType(documentType);
    if (!typeCheck.valid) {
      try { await deleteFile(req.file.path); } catch {}
      return sendBadRequest(res, typeCheck.message);
    }
  }

  const document = await documentService.saveDocument(req.file, userId ? { id: userId } : null, documentType || null);

  sendCreated(res, {
    id: document.id,
    originalName: document.originalName,
    filename: document.filename,
    mimetype: document.mimetype,
    size: document.size,
    sizeFormatted: document.sizeFormatted,
    category: document.category,
    documentType: document.documentType,
    uploadedAt: document.uploadedAt,
  }, 'Document uploaded successfully');
});

const getDocuments = asyncHandler(async (req, res) => {
  const userId = req.query.userId || null;
  const documents = await documentService.getAllDocuments(userId);
  const sanitized = documents.map(doc => ({
    id: doc.id,
    originalName: doc.originalName,
    filename: doc.filename,
    mimetype: doc.mimetype,
    size: doc.size,
    sizeFormatted: doc.sizeFormatted,
    category: doc.category,
    documentType: doc.documentType,
    uploadedAt: doc.uploadedAt,
    ocrProcessed: doc.ocrProcessed,
  }));
  sendSuccess(res, sanitized, 'Documents retrieved successfully');
});

const getDocument = asyncHandler(async (req, res) => {
  const idCheck = validate.documentId(req.params.id);
  if (!idCheck.valid) return sendBadRequest(res, idCheck.message);

  const document = await documentService.getDocumentById(req.params.id);
  if (!document) {
    return sendNotFound(res, 'Document not found');
  }

  sendSuccess(res, document, 'Document retrieved successfully');
});

const deleteDocument = asyncHandler(async (req, res) => {
  const idCheck = validate.documentId(req.params.id);
  if (!idCheck.valid) return sendBadRequest(res, idCheck.message);

  const document = await documentService.getDocumentById(req.params.id);
  if (!document) {
    return sendNotFound(res, 'Document not found');
  }

  try {
    await deleteFile(document.path);
  } catch (error) {
    logger.warn(`File deletion failed for ${document.path}: ${error.message}. Proceeding with record deletion.`);
  }

  await documentService.deleteDocument(req.params.id);

  sendSuccess(res, null, 'Document deleted successfully');
});

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
};