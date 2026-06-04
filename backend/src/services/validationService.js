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
 * Calculate Levenshtein distance between two strings
 * (measures minimum number of edits needed to transform one string to another)
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Advanced word-by-word matching with position awareness and bidirectional scoring
 */
const calculateWordMatchScore = (ocrWords, userWords) => {
  let totalScore = 0;
  let matchedUserWords = 0;
  let positionBonus = 0;

  // Forward matching: How many user words are found in OCR
  userWords.forEach((userWord, userIndex) => {
    let bestMatchScore = 0;
    let bestMatchIndex = -1;

    ocrWords.forEach((ocrWord, ocrIndex) => {
      // Check exact word match
      if (ocrWord === userWord) {
        bestMatchScore = 100;
        bestMatchIndex = ocrIndex;
      }
      // Check if one word contains the other
      else if (ocrWord.includes(userWord) || userWord.includes(ocrWord)) {
        const longer = ocrWord.length > userWord.length ? ocrWord : userWord;
        const shorter = ocrWord.length <= userWord.length ? ocrWord : userWord;
        const containmentScore = (shorter.length / longer.length) * 100;
        if (containmentScore > bestMatchScore) {
          bestMatchScore = containmentScore;
          bestMatchIndex = ocrIndex;
        }
      }
      // Check similarity using Levenshtein distance
      else {
        const maxLen = Math.max(ocrWord.length, userWord.length);
        const distance = levenshteinDistance(ocrWord, userWord);
        const similarityScore = ((maxLen - distance) / maxLen) * 100;

        // Only consider if similarity is above 50%
        if (similarityScore > 50 && similarityScore > bestMatchScore) {
          bestMatchScore = similarityScore;
          bestMatchIndex = ocrIndex;
        }
      }
    });

    if (bestMatchScore > 0) {
      matchedUserWords++;
      totalScore += bestMatchScore;

      // Position bonus: words in similar positions get extra points
      if (bestMatchIndex >= 0) {
        const expectedPosition = (userIndex / userWords.length) * ocrWords.length;
        const actualPosition = bestMatchIndex;
        const positionDiff = Math.abs(expectedPosition - actualPosition);
        const maxPositionDiff = ocrWords.length;
        const positionScore = ((maxPositionDiff - positionDiff) / maxPositionDiff) * 10; // Max 10% bonus
        positionBonus += positionScore;
      }
    }
  });

  // Calculate forward confidence (user words found in OCR)
  const forwardWordMatchPercentage = (totalScore / userWords.length);
  const forwardPositionBonusPercentage = (positionBonus / userWords.length);
  const forwardConfidence = forwardWordMatchPercentage + forwardPositionBonusPercentage;

  // Reverse matching: How many OCR words are found in user input
  // This prevents short user input from getting high confidence on long OCR text
  let reverseMatchedWords = 0;
  ocrWords.forEach((ocrWord) => {
    const found = userWords.some((userWord) => {
      return ocrWord === userWord ||
             ocrWord.includes(userWord) ||
             userWord.includes(ocrWord);
    });
    if (found) {
      reverseMatchedWords++;
    }
  });

  const reverseConfidence = (reverseMatchedWords / ocrWords.length) * 100;

  // Calculate coverage penalty
  // If user entered only a small portion of OCR, reduce confidence
  const coverageRatio = userWords.length / ocrWords.length;
  let coverageFactor = 1.0;

  if (coverageRatio < 0.3) {
    // User entered less than 30% of OCR words - apply penalty
    coverageFactor = 0.5 + (coverageRatio / 0.3) * 0.5; // 0.5 to 1.0 scaling
  } else if (coverageRatio < 0.5) {
    // User entered 30-50% of OCR words - small penalty
    coverageFactor = 0.75 + (coverageRatio - 0.3) / 0.2 * 0.25; // 0.75 to 1.0 scaling
  }

  // Final confidence is weighted average of forward and reverse matching
  // with coverage penalty applied
  const finalConfidence = ((forwardConfidence * 0.7) + (reverseConfidence * 0.3)) * coverageFactor;

  return {
    confidence: parseFloat(Math.min(100, finalConfidence).toFixed(2)),
    matchedWords: matchedUserWords,
    totalWords: userWords.length,
    ocrWords: ocrWords.length,
    coverageRatio: parseFloat(coverageRatio.toFixed(2)),
  };
};

/**
 * Match field values based on strategy
 */
const matchFieldValue = (ocrValue, userData, strategy = 'exact') => {
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
      // Exact match first
      if (ocr === user) {
        return { matched: true, confidence: 100 };
      }

      // Tokenize into words (handle special characters, numbers, etc.)
      const ocrWords = ocr.split(/[\s,.-]+/).filter(w => w.length > 0);
      const userWords = user.split(/[\s,.-]+/).filter(w => w.length > 0);

      if (userWords.length === 0 || ocrWords.length === 0) {
        return { matched: false, confidence: 0 };
      }

      // Use advanced word matching algorithm
      const result = calculateWordMatchScore(ocrWords, userWords);

      // Additional character-level similarity check for short strings
      if (userWords.length === 1 && ocrWords.length === 1) {
        const charLevelDistance = levenshteinDistance(ocr, user);
        const maxLen = Math.max(ocr.length, user.length);
        const charLevelConfidence = ((maxLen - charLevelDistance) / maxLen) * 100;

        // Use the better of word-level or character-level confidence
        result.confidence = Math.max(result.confidence, charLevelConfidence);
      }

      console.log("Result =======>", result);
      
      return {
        matched: result.confidence >= 70,
        confidence: parseFloat(result.confidence.toFixed(2)),
        details: {
          matchedWords: result.matchedWords,
          totalWords: result.totalWords,
        }
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

        // Special threshold for name field - require 80% confidence
        let isMatched = bestMatch.matched;
        if (fieldKey === 'name' && bestMatch.confidence < 80) {
          isMatched = false;
        }

        fieldResults[fieldKey] = {
          label: fieldConfig.label,
          ocrValue,
          matched: isMatched,
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

/**
 * Validate a single field value against a set of format rules
 */
const validateFieldFormat = (value, rules) => {
  const errors = [];
  if (!value) {
    return { valid: false, errors: ['Field value is empty or missing'] };
  }

  const strValue = String(value).trim();

  rules.forEach((rule) => {
    switch (rule.type) {
      case 'length':
        if (strValue.length !== rule.value) {
          errors.push(rule.message || `Must be exactly ${rule.value} characters`);
        }
        break;

      case 'numeric':
        if (!/^\d+$/.test(strValue)) {
          errors.push(rule.message || 'Must only contain digits (0-9)');
        }
        break;

      case 'notStartWith':
        const startsWithInvalid = rule.values.some((prefix) => strValue.startsWith(prefix));
        if (startsWithInvalid) {
          errors.push(rule.message || `Cannot start with ${rule.values.join(' or ')}`);
        }
        break;

      case 'pattern':
        if (!new RegExp(rule.value).test(strValue)) {
          errors.push(rule.message || `Must match pattern ${rule.value}`);
        }
        break;

      default:
        break;
    }
  });

  return { valid: errors.length === 0, errors };
};

/**
 * Validate extracted OCR data against document type format rules
 */
const validateDocumentFormat = (extractedData, documentType) => {
  const config = documentTypeConfig[documentType];
  if (!config || !config.formatRules) {
    return { valid: true, fieldResults: {}, message: 'No format rules defined for this document type' };
  }

  const normalized = normalizeOCRData(extractedData, documentType);
  const fieldResults = {};
  let allValid = true;

  Object.entries(config.formatRules).forEach(([fieldKey, formatConfig]) => {
    const value = normalized[fieldKey];
    const result = validateFieldFormat(value, formatConfig.rules);
    fieldResults[fieldKey] = {
      value: value || null,
      valid: result.valid,
      errors: result.errors,
      required: formatConfig.required || false,
    };
    if (!result.valid) {
      allValid = false;
    }
  });

  return {
    valid: allValid,
    fieldResults,
    message: allValid ? 'All format checks passed' : 'Some format checks failed',
  };
};

module.exports = {
  normalizeOCRData,
  matchFieldValue,
  validateSingleDocument,
  validateMultipleDocuments,
  validateFieldFormat,
  validateDocumentFormat,
};
