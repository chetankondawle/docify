import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: import.meta.env.VITE_API_TIMEOUT ? parseInt(import.meta.env.VITE_API_TIMEOUT) : 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please check your connection and try again.'));
    }

    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection and try again.'));
    }

    const status = error.response.status;
    const serverMessage = error.response.data?.message;

    if (status === 429) {
      return Promise.reject(new Error(serverMessage || 'Too many requests. Please slow down and try again.'));
    }

    if (status >= 500) {
      return Promise.reject(new Error(serverMessage || 'Server error. Please try again later.'));
    }

    const message = serverMessage || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;