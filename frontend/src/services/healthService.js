import apiClient from './api';

export const fetchHealthStatus = () => apiClient.get('/health');
