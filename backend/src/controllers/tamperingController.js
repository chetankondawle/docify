const tamperingService = require('../services/tamperingService');
const geminiService = require('../services/geminiService');
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
  const document = await documentService.getDocumentById(id);
  
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
    const tamperingResult = await tamperingService.checkPDFTampering(document.path, document.documentType);

    // Update document with tampering check results
    await documentService.updatePDFTamperingResults(id, tamperingResult);

    logger.info(`PDF tampering check completed. Risk level: ${tamperingResult.riskLevel}`);

    sendSuccess(res, {
      documentId: document.id,
      safe: tamperingResult.safe,
      riskScore: tamperingResult.riskScore,
      riskLevel: tamperingResult.riskLevel,
      checks: tamperingResult.checks,
      summary: tamperingResult.summary,
      referenceComparison: tamperingResult.referenceComparison,
      cached: false,
    }, 'PDF tampering check completed successfully');

  } catch (error) {
    logger.error(`PDF tampering check failed for document ID: ${id}`, error.message);

    // Save error in document
    await documentService.updatePDFTamperingResults(id, {
      safe: false,
      riskLevel: 'unknown',
      summary: 'Tampering check failed',
    });

    return sendError(res, error.message, 500);
  }
});

/**
 * @desc    Check image for tampering
 * @route   POST /api/v1/tampering/check-image/:id
 * @access  Public
 */
const checkImageTampering = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const document = await documentService.getDocumentById(id);

  if (!document) {
    return sendNotFound(res, 'Document not found');
  }

  if (!document.mimetype || !document.mimetype.startsWith('image/')) {
    return sendError(res, 'Document is not an image', 400);
  }

  if (document.imageTampering) {
    return sendSuccess(res, {
      documentId: document.id,
      ...document.imageTampering,
      cached: true,
    }, 'Image tampering check retrieved from cache');
  }

  try {
    logger.info(`Running image tampering check for document ID: ${id}`);

    // Primary check: heuristic + EXIF + ELA
    const tamperingResult = await tamperingService.checkImageTampering(document.path, document.mimetype, document.documentType);

    // Secondary check: Gemini forensic clarification
    let aiAnalysis = null;
    try {
      aiAnalysis = await geminiService.analyzeImageForTampering(
        document.path,
        document.mimetype,
        tamperingResult.checks
      );
    } catch (geminiErr) {
      logger.warn(`Gemini clarification skipped: ${geminiErr.message}`);
      aiAnalysis = { success: false, verdict: 'unknown', error: geminiErr.message };
    }

    // Combine: heuristic stays primary; Gemini overrides 'safe' if it strongly disagrees
    const aiTampered = aiAnalysis && (aiAnalysis.verdict === 'likely_tampered' || aiAnalysis.verdict === 'ai_generated');
    const aiSuspicious = aiAnalysis && aiAnalysis.verdict === 'suspicious';
    const finalSafe = tamperingResult.safe && !aiTampered && !(aiSuspicious && aiAnalysis.confidence === 'high');

    const finalResult = {
      ...tamperingResult,
      safe: finalSafe,
      aiAnalysis,
    };

    await documentService.updateImageTamperingResults(id, finalResult);

    logger.info(`Image tampering check completed. Risk: ${tamperingResult.riskLevel}, AI verdict: ${aiAnalysis?.verdict || 'n/a'}`);

    sendSuccess(res, {
      documentId: document.id,
      safe: finalResult.safe,
      riskScore: tamperingResult.riskScore,
      riskLevel: tamperingResult.riskLevel,
      format: tamperingResult.format,
      checks: tamperingResult.checks,
      aiAnalysis,
      referenceComparison: tamperingResult.referenceComparison,
      summary: tamperingResult.summary,
      cached: false,
    }, 'Image tampering check completed successfully');

  } catch (error) {
    logger.error(`Image tampering check failed for document ID: ${id}`, error.message);

    await documentService.updateImageTamperingResults(id, {
      safe: false,
      riskLevel: 'unknown',
      summary: 'Tampering check failed',
    });

    return sendError(res, error.message, 500);
  }
});

module.exports = {
  checkPDFTampering,
  checkImageTampering,
};
