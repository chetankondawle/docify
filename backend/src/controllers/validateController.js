const { sendSuccess, sendError, sendBadRequest } = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');

/**
 * Validate extracted OCR data against user provided information
 * @desc    Compare OCR extracted data with user provided details
 * @route   POST /api/v1/validate
 * @access  Public
 */
const validateOCRData = asyncHandler(async (req, res) => {
  const { documentId, userData, ocrData } = req.body;

  // Validate request body
  if (!documentId || !userData || !ocrData) {
    return sendBadRequest(res, 'Missing required fields: documentId, userData, ocrData');
  }

  if (!userData.username || !userData.mobile || !userData.dob || !userData.address) {
    return sendBadRequest(res, 'Incomplete user data. Required: username, mobile, dob, address');
  }

  try {
    logger.info(`Starting OCR data validation for document ID: ${documentId}`);

    const matches = {
      username: false,
      mobile: false,
      dob: false,
      address: false,
    };

    // Validate username (case-insensitive substring match)
    if (ocrData.extractedData?.username) {
      const ocrUsername = String(ocrData.extractedData.username).toLowerCase();
      const userUsername = userData.username.toLowerCase();
      matches.username = 
        ocrUsername.includes(userUsername) || userUsername.includes(ocrUsername);
    }

    // Validate mobile (exact numeric match)
    if (ocrData.extractedData?.mobile) {
      const ocrMobile = String(ocrData.extractedData.mobile).replace(/\D/g, '');
      const userMobile = userData.mobile.replace(/\D/g, '');
      matches.mobile = ocrMobile === userMobile;
    }

    // Validate DOB (numeric date match DDMMYYYY format)
    if (ocrData.extractedData?.dob) {
      const ocrDob = String(ocrData.extractedData.dob).replace(/\D/g, '');
      const userDob = userData.dob.replace(/\D/g, '');
      matches.dob = ocrDob === userDob;
    }

    // Validate address (case-insensitive substring match)
    if (ocrData.extractedData?.address) {
      const ocrAddress = String(ocrData.extractedData.address).toLowerCase();
      const userAddress = userData.address.toLowerCase();
      matches.address =
        ocrAddress.includes(userAddress) || userAddress.includes(ocrAddress);
    }

    // Calculate overall confidence
    const totalMatches = Object.values(matches).filter(Boolean).length;
    const overallConfidence = Math.round((totalMatches / 4) * 100);
    const isValid = totalMatches >= 3; // At least 3 fields must match

    logger.info(
      `OCR validation completed for document ID: ${documentId}. Matches: ${totalMatches}/4`
    );

    sendSuccess(res, {
      documentId,
      matches,
      overallConfidence,
      totalMatches,
      isValid,
      message: isValid 
        ? 'Data validation successful - critical fields matched'
        : 'Data validation incomplete - some fields did not match',
    }, 'OCR data validation completed');

  } catch (error) {
    logger.error(`OCR validation failed for document ID: ${documentId}`, error.message);
    return sendError(res, error.message, 500);
  }
});

module.exports = {
  validateOCRData,
};
