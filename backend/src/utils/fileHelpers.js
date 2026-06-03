const fs = require('fs');
const path = require('path');

/**
 * Delete a file from the filesystem
 * @param {string} filePath - Absolute or relative path to the file
 * @returns {Promise<boolean>}
 */
const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Get file extension from filename
 * @param {string} filename
 * @returns {string}
 */
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

/**
 * Get file type category
 * @param {string} mimetype
 * @returns {string} - 'image' | 'pdf' | 'unknown'
 */
const getFileCategory = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'pdf';
  return 'unknown';
};

/**
 * Format file size in human-readable format
 * @param {number} bytes
 * @returns {string}
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

module.exports = {
  deleteFile,
  getFileExtension,
  getFileCategory,
  formatFileSize,
};
