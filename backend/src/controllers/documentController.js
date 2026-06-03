const documentService = require('../services/documentService');
const { deleteFile } = require('../utils/fileHelpers');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendBadRequest } = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Upload a document (image or PDF)
 * @route   POST /api/v1/documents/upload
 * @access  Public
 */
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendBadRequest(res, 'No file uploaded');
  }

  const document = documentService.saveDocument(req.file, req.user);

  sendCreated(res, document, 'Document uploaded successfully');
});

/**
 * @desc    Get all documents
 * @route   GET /api/v1/documents
 * @access  Public
 */
const getDocuments = asyncHandler(async (req, res) => {
  const documents = documentService.getAllDocuments();
  sendSuccess(res, documents, 'Documents retrieved successfully');
});

/**
 * @desc    Get single document by ID
 * @route   GET /api/v1/documents/:id
 * @access  Public
 */
const getDocument = asyncHandler(async (req, res) => {
  const document = documentService.getDocumentById(req.params.id);
  
  if (!document) {
    return sendNotFound(res, 'Document not found');
  }

  sendSuccess(res, document, 'Document retrieved successfully');
});

/**
 * @desc    Delete document by ID
 * @route   DELETE /api/v1/documents/:id
 * @access  Public
 */
const deleteDocument = asyncHandler(async (req, res) => {
  const document = documentService.getDocumentById(req.params.id);
  
  if (!document) {
    return sendNotFound(res, 'Document not found');
  }

  // Delete from filesystem
  try {
    await deleteFile(document.path);
  } catch (error) {
    return sendError(res, 'Failed to delete file from storage', 500);
  }

  // Delete from service (in-memory or DB)
  documentService.deleteDocument(req.params.id);

  sendSuccess(res, null, 'Document deleted successfully');
});

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
};
