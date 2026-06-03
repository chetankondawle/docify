const geminiService = require('../services/geminiService');
const documentService = require('../services/documentService');
const { sendSuccess, sendError, sendNotFound, sendBadRequest } = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const logger = require('../utils/logger');

/**
 * @desc    Extract text from a document using Gemini OCR
 * @route   POST /api/v1/ocr/extract/:id
 * @access  Public
 */
const extractOCR = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get document from service
  const document = documentService.getDocumentById(id);
  
  if (!document) {
    return sendNotFound(res, 'Document not found');
  }

  // Check if OCR already processed
  if (document.ocrProcessed && document.ocrData) {
    return sendSuccess(res, {
      documentId: document.id,
      documentType: document.ocrData.documentType,
      extractedData: document.ocrData.extractedData,
      confidence: document.ocrData.confidence,
      cached: true,
      processedAt: document.ocrProcessedAt,
    }, 'OCR data retrieved from cache');
  }

  try {
    logger.info(`Starting OCR extraction for document ID: ${id}`);

    // Extract meaningful data using Gemini
    const ocrResult = await geminiService.extractTextFromDocument(
      document.path,
      document.mimetype
    );

    // Update document with OCR result
    documentService.updateDocumentOCR(id, {
      data: ocrResult.data,
      model: ocrResult.model,
    });

    logger.info(`OCR extraction completed for document ID: ${id}`);

    sendSuccess(res, {
      documentId: document.id,
      documentType: ocrResult.data.documentType,
      extractedData: ocrResult.data.extractedData,
      confidence: ocrResult.data.confidence,
      model: ocrResult.model,
      cached: false,
    }, 'OCR extraction completed successfully');

  } catch (error) {
    logger.error(`OCR extraction failed for document ID: ${id}`, error.message);

    // Save error in document
    documentService.updateDocumentOCR(id, {
      data: null,
      error: error.message,
    });

    return sendError(res, error.message, 500);
  }
});

/**
 * @desc    Extract structured data from a document
 * @route   POST /api/v1/ocr/structured/:id
 * @access  Public
 */
const extractStructured = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { schema } = req.body;

  const document = documentService.getDocumentById(id);
  
  if (!document) {
    return sendNotFound(res, 'Document not found');
  }

  try {
    logger.info(`Starting structured data extraction for document ID: ${id}`);

    const result = await geminiService.extractStructuredData(
      document.path,
      document.mimetype,
      schema
    );

    logger.info(`Structured extraction completed for document ID: ${id}`);

    sendSuccess(res, {
      documentId: document.id,
      data: result.data,
      model: result.model,
    }, 'Structured data extraction completed');

  } catch (error) {
    logger.error(`Structured extraction failed for document ID: ${id}`, error.message);
    return sendError(res, error.message, 500);
  }
});

/**
 * @desc    Batch extract OCR from multiple documents
 * @route   POST /api/v1/ocr/batch
 * @access  Public
 */
const batchExtractOCR = asyncHandler(async (req, res) => {
  const { documentIds } = req.body;

  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return sendBadRequest(res, 'documentIds must be a non-empty array');
  }

  const results = [];
  const errors = [];

  for (const id of documentIds) {
    try {
      const document = documentService.getDocumentById(id);
      
      if (!document) {
        errors.push({ id, error: 'Document not found' });
        continue;
      }

      if (document.ocrProcessed && document.ocrData) {
        results.push({
          id: document.id,
          documentType: document.ocrData.documentType,
          extractedData: document.ocrData.extractedData,
          confidence: document.ocrData.confidence,
          cached: true,
        });
        continue;
      }

      const ocrResult = await geminiService.extractTextFromDocument(
        document.path,
        document.mimetype
      );

      documentService.updateDocumentOCR(id, {
        data: ocrResult.data,
        model: ocrResult.model,
      });

      results.push({
        id: document.id,
        documentType: ocrResult.data.documentType,
        extractedData: ocrResult.data.extractedData,
        confidence: ocrResult.data.confidence,
        cached: false,
      });

    } catch (error) {
      errors.push({ id, error: error.message });
    }
  }

  sendSuccess(res, { results, errors }, 'Batch OCR extraction completed');
});

module.exports = {
  extractOCR,
  extractStructured,
  batchExtractOCR,
};
