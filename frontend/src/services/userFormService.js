import apiClient from './api';

export const createUser = (userData) => {
  return apiClient.post('/users', userData);
};

export const getAllUsers = () => {
  return apiClient.get('/users');
};

export const getUserById = (id) => {
  return apiClient.get(`/users/${id}`);
};

export const deleteUser = (id) => {
  return apiClient.delete(`/users/${id}`);
};

const STORAGE_KEY = 'docify_user_info';

export const saveUserInfo = (userData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  } catch (error) {
    console.error('Failed to save user info to localStorage:', error);
  }
};

export const getUserInfo = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to retrieve user info from localStorage:', error);
    return null;
  }
};

export const clearUserInfo = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear user info from localStorage:', error);
  }
};

export const hasUserInfo = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    console.error('Failed to check user info:', error);
    return false;
  }
};