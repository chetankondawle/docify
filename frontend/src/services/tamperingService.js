import apiClient from './api';

/**
 * Check PDF document for tampering
 * @param {number} documentId
 * @returns {Promise}
 */
export const checkTampering = (documentId) =>
  apiClient.post(`/tampering/check/${documentId}`);

/**
 * Check image document for tampering (heuristic + EXIF + ELA + Gemini AI)
 * @param {number} documentId
 * @returns {Promise}
 */
export const checkImageTampering = (documentId) =>
  apiClient.post(`/tampering/check-image/${documentId}`);
