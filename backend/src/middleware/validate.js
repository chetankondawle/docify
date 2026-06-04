const config = require('../config');

const VALID_DOCUMENT_TYPES = ['AADHAAR_CARD', 'PAN_CARD', 'PASSPORT', 'SALARY_SLIP'];

const validate = {
  documentType: (value) => {
    if (!value) return { valid: false, message: 'documentType is required' };
    if (!VALID_DOCUMENT_TYPES.includes(value)) {
      return { valid: false, message: `Invalid documentType "${value}". Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}` };
    }
    return { valid: true };
  },

  documentId: (value) => {
    if (value === undefined || value === null) return { valid: false, message: 'documentId is required' };
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return { valid: false, message: `Invalid documentId "${value}". Must be a positive integer.` };
    return { valid: true, parsed: num };
  },

  nonEmptyObject: (value, name) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { valid: false, message: `${name} must be a non-null object` };
    }
    return { valid: true };
  },

  nonEmptyString: (value, name) => {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return { valid: false, message: `${name} is required and must be a non-empty string` };
    }
    return { valid: true };
  },

  mimeType: (value) => {
    if (!value) return { valid: false, message: 'MIME type is required' };
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowed.includes(value)) {
      return { valid: false, message: `Unsupported MIME type "${value}". Allowed: ${allowed.join(', ')}` };
    }
    return { valid: true };
  },

  arrayOf: (value, name, validator) => {
    if (!Array.isArray(value)) return { valid: false, message: `${name} must be an array` };
    for (let i = 0; i < value.length; i++) {
      const result = validator(value[i]);
      if (!result.valid) return { valid: false, message: `${name}[${i}]: ${result.message}` };
    }
    return { valid: true };
  },
};

module.exports = { validate, VALID_DOCUMENT_TYPES };