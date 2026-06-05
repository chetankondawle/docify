import apiClient from './api';

export const uploadDocument = (formData) => {
  return apiClient.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getAllDocuments = (userId) => {
  const params = userId ? `?userId=${userId}` : '';
  return apiClient.get(`/documents${params}`);
};

export const getDocumentById = (id) => apiClient.get(`/documents/${id}`);

export const deleteDocument = (id) => apiClient.delete(`/documents/${id}`);