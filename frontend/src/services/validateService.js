import apiClient from './api';

/**
 * Validate single document against user information
 * @param {string} documentId - Document ID
 * @param {string} documentType - Document type (AADHAAR, PAN, PASSPORT, SALARY_SLIP)
 * @param {Object} extractedData - Extracted OCR data
 * @param {Object} userData - User provided information
 * @returns {Promise}
 */
export const validateDocument = (documentId, documentType, extractedData, userData) =>
  apiClient.post('/validate/document', {
    documentId,
    documentType,
    extractedData,
    userData,
  });

/**
 * Validate multiple documents for data consistency
 * @param {Array} documents - Array of {documentId, documentType, extractedData}
 * @param {Object} userData - User provided information
 * @returns {Promise}
 */
export const validateDocuments = (documents, userData) =>
  apiClient.post('/validate/documents', {
    documents,
    userData,
  });
