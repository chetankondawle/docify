/**
 * User Form Service - Manages user information storage in localStorage
 * No backend API call - data stays in browser memory
 */

const STORAGE_KEY = 'docify_user_info';

/**
 * Save user information to localStorage
 * @param {Object} userData - User data object with username, mobile, dob, address
 */
export const saveUserInfo = (userData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  } catch (error) {
    console.error('Failed to save user info to localStorage:', error);
    throw new Error('Failed to save user information');
  }
};

/**
 * Retrieve user information from localStorage
 * @returns {Object|null} User data object or null if not found
 */
export const getUserInfo = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to retrieve user info from localStorage:', error);
    return null;
  }
};

/**
 * Clear user information from localStorage
 */
export const clearUserInfo = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear user info from localStorage:', error);
  }
};

/**
 * Check if user information exists
 * @returns {boolean}
 */
export const hasUserInfo = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    console.error('Failed to check user info:', error);
    return false;
  }
};
