import apiClient from './api';

/**
 * Check document for tampering (PDF or image)
 * @param {number} documentId
 * @returns {Promise}
 */
export const checkTampering = (documentId) =>
  apiClient.post(`/tampering/check/${documentId}`);
