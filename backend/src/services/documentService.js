const path = require('path');
const { getFileCategory, formatFileSize } = require('../utils/fileHelpers');

// In-memory storage for demo purposes
// In production, use a database (MongoDB, PostgreSQL, etc.)
const documents = [];
let nextId = 1;

/**
 * Save document metadata
 * @param {Object} file - Multer file object
 * @param {Object} user - User info (optional for now)
 * @param {string} documentType - Document type (e.g., 'AADHAAR_CARD', 'PAN_CARD')
 * @returns {Object} Document metadata
 */
const saveDocument = (file, user = null, documentType = null) => {
  const document = {
    id: nextId++,
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    mimetype: file.mimetype,
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    category: getFileCategory(file.mimetype),
    documentType: documentType, // Store the document type selected during upload
    uploadedBy: user?.id || null,
    uploadedAt: new Date().toISOString(),
    ocrData: null, // OCR extracted data (JSON)
    ocrProcessed: false, // OCR processing status
    ocrError: null, // OCR error if any
    pdfTampering: null, // PDF tampering check results
    imageTampering: null, // Image tampering check results
  };

  documents.push(document);
  return document;
};

/**
 * Update document with OCR results
 * @param {number} id - Document ID
 * @param {Object} ocrResult - OCR extraction result
 * @returns {Object|null} Updated document or null
 */
const updateDocumentOCR = (id, ocrResult) => {
  const document = getDocumentById(id);
  if (!document) return null;

  document.ocrData = ocrResult.data || null;
  document.ocrProcessed = true;
  document.ocrError = ocrResult.error || null;
  document.ocrModel = ocrResult.model || null;
  document.ocrProcessedAt = new Date().toISOString();

  return document;
};

/**
 * Get all documents
 * @returns {Array} List of documents
 */
const getAllDocuments = () => {
  return documents;
};

/**
 * Get document by ID
 * @param {number} id
 * @returns {Object|null}
 */
const getDocumentById = (id) => {
  return documents.find((doc) => doc.id === parseInt(id, 10)) || null;
};

/**
 * Delete document by ID
 * @param {number} id
 * @returns {Object|null} Deleted document or null
 */
const deleteDocument = (id) => {
  const index = documents.findIndex((doc) => doc.id === parseInt(id, 10));
  if (index === -1) return null;

  const [deleted] = documents.splice(index, 1);
  return deleted;
};

/**
 * Update document with PDF tampering check results
 * @param {number} id - Document ID
 * @param {Object} tamperingResult - Tampering check result
 * @returns {Object|null} Updated document or null
 */
const updatePDFTamperingResults = (id, tamperingResult) => {
  const document = getDocumentById(id);
  if (!document) return null;

  document.pdfTampering = {
    safe: tamperingResult.safe,
    riskScore: tamperingResult.riskScore,
    riskLevel: tamperingResult.riskLevel,
    checks: tamperingResult.checks,
    summary: tamperingResult.summary,
    checkedAt: new Date().toISOString(),
  };

  return document;
};

/**
 * Update document with image tampering check results
 * @param {number} id - Document ID
 * @param {Object} tamperingResult - Tampering check result
 * @returns {Object|null} Updated document or null
 */
const updateImageTamperingResults = (id, tamperingResult) => {
  const document = getDocumentById(id);
  if (!document) return null;

  document.imageTampering = {
    safe: tamperingResult.safe,
    riskScore: tamperingResult.riskScore,
    riskLevel: tamperingResult.riskLevel,
    format: tamperingResult.format,
    checks: tamperingResult.checks,
    aiAnalysis: tamperingResult.aiAnalysis || null,
    summary: tamperingResult.summary,
    checkedAt: new Date().toISOString(),
  };

  return document;
};

module.exports = {
  saveDocument,
  getAllDocuments,
  getDocumentById,
  deleteDocument,
  updateDocumentOCR,
  updatePDFTamperingResults,
  updateImageTamperingResults,
};
