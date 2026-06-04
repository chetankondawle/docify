const documentTypeConfig = require('../config/documentConfig');
const logger = require('../utils/logger');

/**
 * Normalize and extract fields from OCR data based on document type config
 */
const normalizeOCRData = (extractedData, documentType) => {
  const config = documentTypeConfig[documentType];
  if (!config) {
    logger.warn(`Unknown document type: ${documentType}`);
    return extractedData;
  }

  const normalized = {};

  Object.entries(config.fields).forEach(([fieldKey, fieldConfig]) => {
    const aliases = fieldConfig.aliases;

    // Try to find matching field in extracted data
    const matchedEntry = Object.entries(extractedData).find(([key]) => {
      const lowerKey = key.toLowerCase().replace(/[_\s]/g, '');
      return aliases.some(alias => lowerKey.includes(alias.toLowerCase().replace(/[_\s]/g, '')));
    });

    if (matchedEntry) {
      normalized[fieldKey] = matchedEntry[1];
    }
  });

  return normalized;
};

/**
 * Match field values based on strategy
 */
const matchFieldValue = (ocrValue, userData, strategy = 'substring') => {
  if (!ocrValue || !userData) return { matched: false, confidence: 0 };

  const ocr = String(ocrValue).toLowerCase().trim();
  const user = String(userData).toLowerCase().trim();

  switch (strategy) {
    case 'exact':
      const matched = ocr === user;
      return {
        matched,
        confidence: matched ? 100 : 0,
      };

    case 'numeric':
      const ocrNum = ocr.replace(/\D/g, '');
      const userNum = user.replace(/\D/g, '');
      const numMatched = ocrNum === userNum;
      return {
        matched: numMatched,
        confidence: numMatched ? 100 : 0,
      };

    case 'dateFormat':
      const ocrDate = ocr.replace(/\D/g, '');
      const userData_Date = user.replace(/\D/g, '');
      const dateMatched = ocrDate === userData_Date;
      return {
        matched: dateMatched,
        confidence: dateMatched ? 100 : ocrDate.includes(userData_Date.slice(4)) ? 50 : 0,
      };

    case 'substring':
    default:
      const substringMatch = ocr.includes(user) || user.includes(ocr);
      if (substringMatch) return { matched: true, confidence: 100 };
      
      // Partial match
      const words = user.split(/\s+/);
      const matchedWords = words.filter(w => ocr.includes(w)).length;
      const confidence = Math.round((matchedWords / words.length) * 100);
      return {
        matched: confidence >= 70,
        confidence,
      };
  }
};

/**
 * Validate single document against user data
 */
const validateSingleDocument = (extractedData, documentType, userData) => {
  const config = documentTypeConfig[documentType];
  if (!config) {
    throw new Error(`Unsupported document type: ${documentType}`);
  }

  const normalized = normalizeOCRData(extractedData, documentType);
  const fieldResults = {};
  let highPriorityMatches = 0;
  let highPriorityFields = 0;

  Object.entries(config.fields).forEach(([fieldKey, fieldConfig]) => {
    const ocrValue = normalized[fieldKey];
    
    if (fieldConfig.matchWith && fieldConfig.matchWith.length > 0) {
      const userValues = fieldConfig.matchWith.map(key => userData[key]).filter(v => v);
      
      if (ocrValue && userValues.length > 0) {
        const results = userValues.map(userValue =>
          matchFieldValue(ocrValue, userValue, fieldConfig.matchStrategy)
        );
        
        const bestMatch = results.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        );

        fieldResults[fieldKey] = {
          label: fieldConfig.label,
          ocrValue,
          matched: bestMatch.matched,
          confidence: bestMatch.confidence,
          priority: fieldConfig.priority,
        };

        if (fieldConfig.priority === 'high') {
          highPriorityFields++;
          if (bestMatch.matched) highPriorityMatches++;
        }
      }
    }
  });

  const matchedFields = Object.values(fieldResults).filter(f => f.matched).length;
  const totalFields = Object.values(fieldResults).length;
  const avgConfidence = Object.values(fieldResults).length > 0
    ? Math.round(
        Object.values(fieldResults).reduce((sum, f) => sum + f.confidence, 0) /
        Object.values(fieldResults).length
      )
    : 0;

  const isValid = highPriorityMatches === highPriorityFields && matchedFields === totalFields;

  return {
    documentType,
    fieldResults,
    summary: {
      matchedFields,
      totalFields,
      averageConfidence: avgConfidence,
      highPriorityMatches,
      highPriorityFields,
    },
    isValid,
    status: isValid ? 'VALID' : 'INVALID',
  };
};

/**
 * Validate multiple documents for data consistency
 */
const validateMultipleDocuments = (documentsData, userData) => {
  const validations = {};
  const crossDocumentIssues = [];
  
  // Validate each document
  Object.entries(documentsData).forEach(([docId, { extractedData, documentType }]) => {
    validations[docId] = validateSingleDocument(extractedData, documentType, userData);
  });

  // Check consistency across documents for critical fields
  const criticalFieldsToCheck = {
    name: { label: 'Name', severity: 'HIGH' },
    dateOfBirth: { label: 'Date of Birth', severity: 'HIGH' },
    dob: { label: 'Date of Birth', severity: 'HIGH' },
  };

  Object.entries(criticalFieldsToCheck).forEach(([fieldName, fieldConfig]) => {
    const extractedValues = {};

    Object.entries(documentsData).forEach(([docId, { documentType }]) => {
      const result = validations[docId];

      // Check both camelCase and snake_case versions
      const field = result.fieldResults[fieldName];
      if (field?.ocrValue) {
        const value = String(field.ocrValue).toLowerCase().trim();
        if (!extractedValues[value]) {
          extractedValues[value] = [];
        }
        extractedValues[value].push(docId);
      }
    });

    // Report inconsistency if multiple values found
    if (Object.keys(extractedValues).length > 1) {
      crossDocumentIssues.push({
        field: fieldName,
        severity: fieldConfig.severity,
        message: `Different ${fieldConfig.label} values found across documents`,
        details: extractedValues,
      });
    }
  });

  return {
    validations,
    crossDocumentIssues,
    overallValid: Object.values(validations).every(v => v.isValid) && crossDocumentIssues.length === 0,
  };
};

module.exports = {
  normalizeOCRData,
  matchFieldValue,
  validateSingleDocument,
  validateMultipleDocuments,
};
