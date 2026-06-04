const geminiService = require('../services/geminiService');
const documentService = require('../services/documentService');
const { assessImageQuality } = require('../services/imageQualityService');
const { validateOcrDataQuality } = require('../services/ocrValidationService');
// Import schemas from JSON file
const schemas = require('../config/schemas.json'); 
const { isDocTypeMismatch } = require('../utils/docTypeMapping');
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
 * @desc    Extract structured data from a document based on document type
 * @route   POST /api/v1/ocr/structured/:id
 * @access  Public
 */
const extractStructured = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentType } = req.body; // Expecting documentType in ALL_CAPS_UNDERSCORE format

  if (!documentType) {
    return sendBadRequest(res, 'documentType is required in the request body');
  }

  const document = documentService.getDocumentById(id);
  
  if (!document) {
    return sendNotFound(res, 'Document not found');
  }

  // Retrieve the schema based on the documentType from the JSON file
  // The keys in schemas.json are now in ALL_CAPS_UNDERSCORE format
  const schemaConfig = schemas[documentType];

  if (!schemaConfig) {
    // Fallback to generic extraction if schema not found, or return an error
    logger.warn(`Schema for document type "${documentType}" not found. Falling back to generic extraction.`);
    // Option 1: Return an error
    // return sendNotFound(res, `Schema for document type "${documentType}" not found.`);
    
    // Option 2: Fallback to generic OCR extraction (if you want this behavior)
    try {
        logger.info(`Falling back to generic OCR extraction for document ID: ${id}`);
        const ocrResult = await geminiService.extractTextFromDocument(
            document.path,
            document.mimetype
        );
        return sendSuccess(res, {
            documentId: document.id,
            // Use the provided documentType, which might be unknown if schema not found
            documentType: documentType, 
            extractedData: ocrResult.data.extractedData || ocrResult.data, // Use detected data or raw data
            confidence: ocrResult.data.confidence || 'low',
            model: ocrResult.model,
            message: `Schema for "${documentType}" not found. Generic OCR data returned.`,
        }, 'Generic OCR extraction completed');
    } catch (fallbackError) {
        logger.error(`Fallback generic OCR extraction failed for document ID: ${id}`, fallbackError.message);
        return sendError(res, `Could not extract structured data for "${documentType}" and fallback failed: ${fallbackError.message}`, 500);
    }
  }

  try {
    logger.info(`Starting structured data extraction for document ID: ${id} of type: ${documentType}`);

    // Pre-OCR: assess image quality for images
    let imageQuality = null;
    if (document.mimetype && document.mimetype.startsWith('image/')) {
      imageQuality = await assessImageQuality(document.path, document.mimetype);
      if (!imageQuality.pass) {
        logger.warn(`Image quality check failed for doc ${id}: ${imageQuality.message}`);
      }
    }

    // Pass the schema definition to the service
    const result = await geminiService.extractStructuredData(
      document.path,
      document.mimetype,
      schemaConfig.schema
    );

    // Detect document type mismatch
    const detectedType = result.data?.detectedDocumentType;
    let typeMismatch = null;
    if (detectedType && detectedType !== 'unknown') {
      const check = isDocTypeMismatch(documentType, detectedType);
      if (check.mismatch) {
        typeMismatch = check;
        logger.warn(`Document type mismatch for doc ${id}: selected=${documentType}, detected=${detectedType}`);
      }
    }

    // Post-OCR: validate extracted data quality against schema
    let dataQuality = null;
    const extractedFields = result.data?.extractedData || {};
    if (Object.keys(extractedFields).length > 0 && !result.data?.parseError) {
      dataQuality = validateOcrDataQuality(
        { documentType, extractedData: extractedFields, confidence: result.data?.confidence || 'high' },
        documentType
      );
    }

    logger.info(`Structured extraction completed for document ID: ${id}`);

    if (typeMismatch) {
      return sendError(res, typeMismatch.message, 400);
    }

    sendSuccess(res, {
      documentId: document.id,
      documentType: documentType,
      detectedDocumentType: detectedType,
      extractedData: extractedFields,
      model: result.model,
      quality: {
        image: imageQuality ? { score: imageQuality.score, quality: imageQuality.quality, issues: imageQuality.issues } : null,
        data: dataQuality ? { score: dataQuality.overallScore, passed: dataQuality.passed, errors: dataQuality.errors, warnings: dataQuality.warnings } : null,
      },
    }, 'Structured data extraction completed');

  } catch (error) {
    logger.error(`Structured extraction failed for document ID: ${id}`, error.message);
    return sendError(res, error.message, 500);
  }
});

/**
 * @desc    Get a list of available document types and their schemas
 * @route   GET /api/v1/ocr/documentTypes
 * @access  Public
 */
const getDocumentTypes = asyncHandler(async (req, res) => {
  try {
    // Object.keys will return the keys as they are in the JSON file (ALL_CAPS_UNDERSCORE)
    const documentTypes = Object.keys(schemas); 
    sendSuccess(res, { documentTypes }, 'Available document types retrieved successfully');
  } catch (error) {
    logger.error('Failed to retrieve document types:', error.message);
    sendError(res, 'Failed to retrieve document types', 500);
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
  getDocumentTypes, // Export the new function
  batchExtractOCR,
};
