const { Document } = require('../models');
const { getFileCategory, formatFileSize } = require('../utils/fileHelpers');
const logger = require('../utils/logger');

const saveDocument = async (file, user = null, documentType = null) => {
  const docData = {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    mimetype: file.mimetype,
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    category: getFileCategory(file.mimetype),
    documentType: documentType,
    userId: user?.id || null,
  };

  try {
    const document = await Document.create(docData);
    return document.get({ plain: true });
  } catch (error) {
    logger.error('Failed to save document to database:', error.message);
    const fallback = {
      id: Date.now(),
      ...docData,
      uploadedAt: new Date().toISOString(),
      ocrData: null,
      ocrProcessed: false,
      ocrError: null,
      formatValidation: null,
      pdfTampering: null,
      imageTampering: null,
    };
    return fallback;
  }
};

const updateDocumentOCR = async (id, ocrResult) => {
  try {
    const document = await Document.findByPk(id);
    if (!document) return null;

    document.ocrData = ocrResult.data || null;
    document.ocrProcessed = true;
    document.ocrError = ocrResult.error || null;
    document.ocrModel = ocrResult.model || null;
    document.ocrProcessedAt = new Date();

    await document.save();
    return document.get({ plain: true });
  } catch (error) {
    logger.error(`Failed to update OCR for document ${id}:`, error.message);
    return null;
  }
};

const getAllDocuments = async (userId = null) => {
  try {
    const where = userId ? { userId } : {};
    const documents = await Document.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    return documents.map(d => d.get({ plain: true }));
  } catch (error) {
    logger.error('Failed to fetch documents from database:', error.message);
    return [];
  }
};

const getDocumentById = async (id) => {
  try {
    const document = await Document.findByPk(id);
    return document ? document.get({ plain: true }) : null;
  } catch (error) {
    logger.error(`Failed to fetch document ${id}:`, error.message);
    return null;
  }
};

const deleteDocument = async (id) => {
  try {
    const document = await Document.findByPk(id);
    if (!document) return null;

    const deleted = document.get({ plain: true });
    await document.destroy();
    return deleted;
  } catch (error) {
    logger.error(`Failed to delete document ${id}:`, error.message);
    return null;
  }
};

const updatePDFTamperingResults = async (id, tamperingResult) => {
  try {
    const document = await Document.findByPk(id);
    if (!document) return null;

    document.pdfTampering = {
      safe: tamperingResult.safe,
      riskScore: tamperingResult.riskScore,
      riskLevel: tamperingResult.riskLevel,
      checks: tamperingResult.checks,
      summary: tamperingResult.summary,
      aiAnalysis: tamperingResult.aiAnalysis || null,
      checkedAt: new Date().toISOString(),
    };

    await document.save();
    return document.get({ plain: true });
  } catch (error) {
    logger.error(`Failed to update PDF tampering for document ${id}:`, error.message);
    return null;
  }
};

const updateImageTamperingResults = async (id, tamperingResult) => {
  try {
    const document = await Document.findByPk(id);
    if (!document) return null;

    document.imageTampering = {
      safe: tamperingResult.safe,
      riskScore: tamperingResult.riskScore,
      riskLevel: tamperingResult.riskLevel,
      format: tamperingResult.format,
      checks: tamperingResult.checks,
      aiAnalysis: tamperingResult.aiAnalysis || null,
      referenceComparison: tamperingResult.referenceComparison || null,
      summary: tamperingResult.summary,
      checkedAt: new Date().toISOString(),
    };

    await document.save();
    return document.get({ plain: true });
  } catch (error) {
    logger.error(`Failed to update image tampering for document ${id}:`, error.message);
    return null;
  }
};

const updateDocumentFormatValidation = async (id, formatValidation) => {
  try {
    const document = await Document.findByPk(id);
    if (!document) return null;

    document.formatValidation = {
      valid: formatValidation.valid,
      fieldResults: formatValidation.fieldResults,
      message: formatValidation.message,
      validatedAt: new Date().toISOString(),
    };

    await document.save();
    return document.get({ plain: true });
  } catch (error) {
    logger.error(`Failed to update format validation for document ${id}:`, error.message);
    return null;
  }
};

const deleteDocumentsByUserId = async (userId) => {
  try {
    const documents = await Document.findAll({ where: { userId } });
    const deleted = documents.map(d => d.get({ plain: true }));
    await Document.destroy({ where: { userId } });
    return deleted;
  } catch (error) {
    logger.error(`Failed to delete documents for user ${userId}:`, error.message);
    return [];
  }
};

module.exports = {
  saveDocument,
  getAllDocuments,
  getDocumentById,
  deleteDocument,
  deleteDocumentsByUserId,
  updateDocumentOCR,
  updateDocumentFormatValidation,
  updatePDFTamperingResults,
  updateImageTamperingResults,
};