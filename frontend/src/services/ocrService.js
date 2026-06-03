import apiClient from './api';

/**
 * Extract OCR text from a document
 * @param {number} documentId
 * @returns {Promise}
 */
export const extractOCR = (documentId) => apiClient.post(`/ocr/extract/${documentId}`);

/**
 * Extract structured data from a document
 * @param {number} documentId
 * @param {string} schema - Description of expected data structure
 * @returns {Promise}
 */
export const extractStructuredData = (documentId, schema) => 
  apiClient.post(`/ocr/structured/${documentId}`, { schema });

/**
 * Batch extract OCR from multiple documents
 * @param {Array<number>} documentIds
 * @returns {Promise}
 */
export const batchExtractOCR = (documentIds) => 
  apiClient.post('/ocr/batch', { documentIds });
