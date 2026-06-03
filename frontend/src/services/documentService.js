import apiClient from './api';

/**
 * Upload a document (FormData)
 * @param {FormData} formData
 * @returns {Promise}
 */
export const uploadDocument = (formData) => {
  return apiClient.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Get all documents
 * @returns {Promise}
 */
export const getAllDocuments = () => apiClient.get('/documents');

/**
 * Get single document by ID
 * @param {number} id
 * @returns {Promise}
 */
export const getDocumentById = (id) => apiClient.get(`/documents/${id}`);

/**
 * Delete document by ID
 * @param {number} id
 * @returns {Promise}
 */
export const deleteDocument = (id) => apiClient.delete(`/documents/${id}`);
