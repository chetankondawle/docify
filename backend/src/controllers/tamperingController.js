const tamperingService = require('../services/tamperingService');
const documentService = require('../services/documentService');
const { sendSuccess, sendError, sendNotFound } = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');

/**
 * @desc    Check document for tampering (PDF or image)
 * @route   POST /api/v1/tampering/check/:id
 * @access  Public
 */
const checkPDFTampering = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get document from service
  const document = documentService.getDocumentById(id);
  
  if (!document) {
    return sendNotFound(res, 'Document not found');
  }

  // Verify it's a PDF
  if (document.mimetype !== 'application/pdf') {
    return sendError(res, 'Document is not a PDF', 400);
  }

  // Check if tampering check already done
  if (document.pdfTampering) {
    return sendSuccess(res, {
      documentId: document.id,
      ...document.pdfTampering,
      cached: true,
    }, 'PDF tampering check retrieved from cache');
  }

  try {
    logger.info(`Running tampering check for document ID: ${id}`);

    // Run tampering check
    const tamperingResult = await tamperingService.checkPDFTampering(document.path);

    // Update document with tampering check results
    documentService.updatePDFTamperingResults(id, tamperingResult);

    logger.info(`PDF tampering check completed. Risk level: ${tamperingResult.riskLevel}`);

    sendSuccess(res, {
      documentId: document.id,
      safe: tamperingResult.safe,
      riskScore: tamperingResult.riskScore,
      riskLevel: tamperingResult.riskLevel,
      checks: tamperingResult.checks,
      summary: tamperingResult.summary,
      cached: false,
    }, 'PDF tampering check completed successfully');

  } catch (error) {
    logger.error(`PDF tampering check failed for document ID: ${id}`, error.message);

    // Save error in document
    documentService.updatePDFTamperingResults(id, {
      safe: false,
      riskLevel: 'unknown',
      summary: 'Tampering check failed',
    });

    return sendError(res, error.message, 500);
  }
});

module.exports = {
  checkPDFTampering,
};
