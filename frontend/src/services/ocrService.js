import apiClient from './api';

/**
 * Extract OCR text from a document
 * @param {number} documentId
 * @returns {Promise}
 */
export const extractOCR = (documentId) => apiClient.post(`/ocr/extract/${documentId}`);

/**
 * Extract structured data from a document based on document type
 * @param {number} documentId
 * @param {string} documentType - The type of document in ALL_CAPS_UNDERSCORE format (e.g., 'AADHAAR_CARD')
 * @returns {Promise}
 */
export const extractStructuredData = (documentId, documentType) => 
  apiClient.post(`/ocr/structured/${documentId}`, { documentType });

/**
 * Fetch available document types and their schemas from the backend
 * @returns {Promise<Array<string>>} - A promise that resolves with an array of document type strings in ALL_CAPS_UNDERSCORE format.
 */
export const getDocumentTypes = () => apiClient.get('/ocr/documentTypes'); // This endpoint returns { data: { documentTypes: [...] } } in ALL_CAPS_UNDERSCORE format

/**
 * Batch extract OCR from multiple documents
 * @param {Array<number>} documentIds
 * @returns {Promise}
 */
export const batchExtractOCR = (documentIds) => 
  apiClient.post('/ocr/batch', { documentIds });


