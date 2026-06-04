const schemas = require('../config/schemas.json');
const documentConfig = require('../config/documentConfig');
const { validateFormat, validateDate, validateNumeric, validateNotEmpty, validateMonthYear } = require('../utils/formatValidators');
const logger = require('../utils/logger');

const CONFIDENCE_THRESHOLDS = {
  MINIMUM_ACCEPTABLE: 'medium',
  SCORE_MAP: { low: 0, medium: 50, high: 100 },
};

const validateOcrDataQuality = (ocrData, documentType) => {
  const result = {
    passed: false,
    overallScore: 0,
    checks: [],
    warnings: [],
    errors: [],
    fieldValidations: {},
    confidenceAssessment: null,
  };

  result.confidenceAssessment = assessConfidence(ocrData.confidence);
  if (!result.confidenceAssessment.pass) {
    result.errors.push(result.confidenceAssessment.message);
  }

  const schemaConfig = schemas[documentType];
  if (!schemaConfig) {
    result.warnings.push(`No schema defined for document type "${documentType}" — skipping field-level validation`);
    result.passed = result.errors.length === 0;
    result.overallScore = result.errors.length > 0 ? 0 : 50;
    return result;
  }

  const fieldValidations = {};
  const schema = schemaConfig.schema;
  const extracted = ocrData.extractedData || {};

  const fieldConfigs = documentConfig[documentType]?.fields || {};

  for (const [fieldName, expectedType] of Object.entries(schema)) {
    const rawValue = extracted[fieldName];
    const fieldConfig = fieldConfigs[fieldName];
    const validation = validateField(rawValue, fieldName, expectedType, fieldConfig);

    fieldValidations[fieldName] = validation;
    result.checks.push(validation);

    if (!validation.pass) {
      if (validation.severity === 'error') {
        result.errors.push(validation.message);
      } else {
        result.warnings.push(validation.message);
      }
    }
  }

  const missingRequired = findMissingRequiredFields(schema, extracted, fieldConfigs);
  missingRequired.forEach(m => {
    result.errors.push(m.message);
    result.checks.push(m);
  });

  const consistencyIssues = checkCrossFieldConsistency(extracted, documentType);
  consistencyIssues.forEach(issue => {
    result.warnings.push(issue.message);
    result.checks.push(issue);
  });

  const emptyCount = Object.keys(extracted).length === 0;
  if (emptyCount) {
    result.errors.push('No data fields were extracted from the document');
  }

  const score = calculateQualityScore(result);
  result.overallScore = score;
  result.passed = score >= 50 && result.confidenceAssessment.pass;
  result.fieldValidations = fieldValidations;

  return result;
};

const assessConfidence = (confidence) => {
  const level = (confidence || 'low').toLowerCase();

  if (level === 'low') {
    return {
      pass: false,
      level: 'low',
      score: 0,
      message: 'OCR confidence is "low" — extracted data may be unreliable',
    };
  }

  if (level === 'medium') {
    return {
      pass: true,
      level: 'medium',
      score: 50,
      message: 'OCR confidence is "medium" — review critical fields',
      needsReview: true,
    };
  }

  return {
    pass: true,
    level: 'high',
    score: 100,
    message: 'OCR confidence is "high"',
  };
};

const validateField = (value, fieldName, expectedType, fieldConfig) => {
  const label = fieldConfig?.label || fieldName;
  const priority = fieldConfig?.priority || 'medium';
  const severity = priority === 'high' ? 'error' : 'warning';

  if (value === null || value === undefined || value === '') {
    return {
      field: fieldName,
      label,
      pass: false,
      severity,
      priority,
      message: `"${label}" is missing or empty`,
      value: null,
      typeValid: false,
      formatValid: null,
    };
  }

  const notEmpty = validateNotEmpty(value);
  if (!notEmpty.valid) {
    return {
      field: fieldName,
      label,
      pass: false,
      severity,
      priority,
      message: `"${label}" ${notEmpty.error}`,
      value,
      typeValid: true,
      formatValid: null,
    };
  }

  const typeCheck = validateType(value, expectedType, fieldName);
  if (!typeCheck.valid) {
    return {
      field: fieldName,
      label,
      pass: false,
      severity,
      priority,
      message: typeCheck.message,
      value,
      typeValid: false,
      formatValid: null,
    };
  }

  const formatCheck = validateFieldFormat(value, fieldName);
  if (formatCheck && !formatCheck.valid) {
    return {
      field: fieldName,
      label,
      pass: false,
      severity,
      priority,
      message: formatCheck.message,
      value,
      typeValid: true,
      formatValid: false,
    };
  }

  return {
    field: fieldName,
    label,
    pass: true,
    severity: null,
    priority,
    message: `"${label}" is valid`,
    value,
    typeValid: true,
    formatValid: true,
  };
};

const validateType = (value, expectedType, fieldName) => {
  const str = String(value).trim();

  const typeLower = expectedType.toLowerCase();

  if (typeLower.startsWith('string')) {
    return { valid: str.length > 0 };
  }

  if (typeLower.startsWith('number')) {
    const cleaned = str.replace(/[₹$,€\s]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) {
      return { valid: false, message: `"${fieldName}" should be a number but got "${value}"` };
    }
    return { valid: true };
  }

  if (typeLower.startsWith('date') || typeLower.includes('yyyy-mm-dd')) {
    const dateCheck = validateDate(value);
    if (!dateCheck.valid) {
      return { valid: false, message: `"${fieldName}" ${dateCheck.error}` };
    }
    return { valid: true };
  }

  if (typeLower.startsWith('enum')) {
    return { valid: true };
  }

  return { valid: true };
};

const validateFieldFormat = (value, fieldName) => {
  const formatMap = {
    aadhaarNumber: 'AADHAAR',
    panNumber: 'PAN',
    employeePanNumber: 'PAN',
    passportNumber: 'PASSPORT',
  };

  const formatName = formatMap[fieldName];
  if (!formatName) return null;

  return validateFormat(String(value), formatName);
};

const findMissingRequiredFields = (schema, extracted, fieldConfigs) => {
  const missing = [];

  for (const [fieldName] of Object.entries(schema)) {
    const config = fieldConfigs[fieldName];
    if (config?.priority === 'high' && !extracted[fieldName]) {
      missing.push({
        field: fieldName,
        label: config.label,
        pass: false,
        severity: 'error',
        priority: 'high',
        message: `Required field "${config.label}" is missing from extracted data`,
        value: null,
        typeValid: false,
        formatValid: null,
      });
    }
  }

  return missing;
};

const checkCrossFieldConsistency = (extracted, documentType) => {
  const issues = [];

  if (documentType === 'SALARY_SLIP') {
    const basic = parseFloat(String(extracted.basicSalary || '0').replace(/[₹$,€\s]/g, ''));
    const allowances = parseFloat(String(extracted.allowances || '0').replace(/[₹$,€\s]/g, ''));
    const deductions = parseFloat(String(extracted.deductions || '0').replace(/[₹$,€\s]/g, ''));
    const net = parseFloat(String(extracted.netSalary || '0').replace(/[₹$,€\s]/g, ''));

    if (!isNaN(basic) && !isNaN(allowances) && !isNaN(deductions) && !isNaN(net)) {
      const expectedNet = basic + allowances - deductions;
      const diff = Math.abs(expectedNet - net);
      const tolerance = Math.max(expectedNet * 0.05, 1);

      if (diff > tolerance) {
        issues.push({
          field: 'netSalary',
          label: 'Net Salary',
          pass: false,
          severity: 'warning',
          priority: 'medium',
          message: `Net salary (${net}) does not match basic + allowances - deductions (${expectedNet}) — difference: ${diff}`,
          value: net,
          typeValid: true,
          formatValid: null,
        });
      }
    }

    const monthYear = extracted.monthYear;
    if (monthYear) {
      const mvCheck = validateMonthYear(monthYear);
      if (!mvCheck.valid) {
        issues.push({
          field: 'monthYear',
          label: 'Month & Year',
          pass: false,
          severity: 'warning',
          priority: 'medium',
          message: mvCheck.error,
          value: monthYear,
          typeValid: true,
          formatValid: false,
        });
      }
    }

    if (basic && basic <= 0) {
      issues.push({
        field: 'basicSalary',
        label: 'Basic Salary',
        pass: false,
        severity: 'warning',
        priority: 'medium',
        message: `Basic salary (${basic}) should be a positive amount`,
        value: basic,
        typeValid: true,
        formatValid: null,
      });
    }

    if (net && net <= 0) {
      issues.push({
        field: 'netSalary',
        label: 'Net Salary',
        pass: false,
        severity: 'warning',
        priority: 'medium',
        message: `Net salary (${net}) should be a positive amount`,
        value: net,
        typeValid: true,
        formatValid: null,
      });
    }

    if (deductions && deductions < 0) {
      issues.push({
        field: 'deductions',
        label: 'Deductions',
        pass: false,
        severity: 'warning',
        priority: 'low',
        message: `Deductions (${deductions}) should not be negative`,
        value: deductions,
        typeValid: true,
        formatValid: null,
      });
    }
  }

  if (documentType === 'AADHAAR_CARD' || documentType === 'PAN_CARD' || documentType === 'PASSPORT') {
    const docName = extracted.name || '';
    const docGender = extracted.gender || '';

    if (docName && docName.length < 3) {
      issues.push({
        field: 'name',
        label: 'Name',
        pass: false,
        severity: 'warning',
        priority: 'medium',
        message: `Extracted name "${docName}" is suspiciously short`,
        value: docName,
        typeValid: true,
        formatValid: null,
      });
    }

    if (docGender && !['male', 'female', 'm', 'f', 'other'].includes(docGender.toLowerCase().trim())) {
      issues.push({
        field: 'gender',
        label: 'Gender',
        pass: false,
        severity: 'warning',
        priority: 'low',
        message: `Extracted gender "${docGender}" may be incorrect`,
        value: docGender,
        typeValid: true,
        formatValid: null,
      });
    }
  }

  return issues;
};

const calculateQualityScore = (result) => {
  const errorPenalty = result.errors.length * 20;
  const warningPenalty = result.warnings.length * 5;

  const totalChecks = result.checks.length || 1;
  const passedChecks = result.checks.filter(c => c.pass).length;
  const passRate = (passedChecks / totalChecks) * 100;

  const score = Math.max(0, Math.min(100, passRate - errorPenalty - warningPenalty));
  return Math.round(score);
};

module.exports = { validateOcrDataQuality, CONFIDENCE_THRESHOLDS };