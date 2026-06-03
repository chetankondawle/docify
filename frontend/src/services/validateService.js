import apiClient from './api';

/**
 * Validate extracted OCR data against user provided information
 * @param {number} documentId - Document ID from OCR extraction
 * @param {Object} userData - User provided information
 * @param {string} userData.username
 * @param {string} userData.mobile
 * @param {string} userData.dob - Date of birth (YYYY-MM-DD format)
 * @param {string} userData.address
 * @param {Object} ocrData - Extracted OCR data
 * @returns {Promise}
 */
export const validateOCRData = (documentId, userData, ocrData) =>
  apiClient.post('/validate', {
    documentId,
    userData,
    ocrData,
  });

/**
 * Validate OCR data fields match user information
 * @param {Object} ocrData - Extracted OCR data object
 * @param {Object} userData - User provided information
 * @returns {Object} Validation result with match percentage and field details
 */
export const validateDataLocally = (ocrData, userData) => {
  const matches = {
    username: false,
    mobile: false,
    dob: false,
    address: false,
  };

  const confidence = {
    username: 0,
    mobile: 0,
    dob: 0,
    address: 0,
  };

  // Check username match (case-insensitive substring match)
  if (ocrData.extractedData?.username) {
    const ocrUsername = String(ocrData.extractedData.username).toLowerCase();
    const userUsername = userData.username.toLowerCase();
    matches.username = ocrUsername.includes(userUsername) || userUsername.includes(ocrUsername);
    confidence.username = matches.username ? 100 : 0;
  }

  // Check mobile match (exact match)
  if (ocrData.extractedData?.mobile) {
    const ocrMobile = String(ocrData.extractedData.mobile).replace(/\D/g, '');
    const userMobile = userData.mobile.replace(/\D/g, '');
    matches.mobile = ocrMobile === userMobile;
    confidence.mobile = matches.mobile ? 100 : 0;
  }

  // Check DOB match
  if (ocrData.extractedData?.dob) {
    const ocrDob = String(ocrData.extractedData.dob).replace(/\D/g, '');
    const userDob = userData.dob.replace(/\D/g, '');
    matches.dob = ocrDob === userDob;
    confidence.dob = matches.dob ? 100 : 0;
  }

  // Check address match (substring match)
  if (ocrData.extractedData?.address) {
    const ocrAddress = String(ocrData.extractedData.address).toLowerCase();
    const userAddress = userData.address.toLowerCase();
    matches.address = ocrAddress.includes(userAddress) || userAddress.includes(ocrAddress);
    confidence.address = matches.address ? 100 : 0;
  }

  const totalMatches = Object.values(matches).filter(Boolean).length;
  const overallConfidence = Math.round((totalMatches / 4) * 100);

  return {
    matches,
    confidence,
    overallConfidence,
    totalMatches,
    isValid: totalMatches >= 3, // At least 3 fields must match
  };
};
