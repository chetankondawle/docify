const GEMINI_TYPE_MAP = {
  aadhaar_card: 'AADHAAR_CARD',
  aadharcard: 'AADHAAR_CARD',
  aadhaar: 'AADHAAR_CARD',
  pan_card: 'PAN_CARD',
  pancard: 'PAN_CARD',
  pan: 'PAN_CARD',
  passport: 'PASSPORT',
  salary_slip: 'SALARY_SLIP',
  salaryslip: 'SALARY_SLIP',
  payslip: 'SALARY_SLIP',
  pay_slip: 'SALARY_SLIP',
};

const SYSTEM_TYPES = ['AADHAAR_CARD', 'PAN_CARD', 'PASSPORT', 'SALARY_SLIP'];

const normalizeDetectedType = (detectedType) => {
  if (!detectedType || typeof detectedType !== 'string') return null;

  const normalized = detectedType.toLowerCase().replace(/[\s_-]+/g, '_').trim();

  if (GEMINI_TYPE_MAP[normalized]) return GEMINI_TYPE_MAP[normalized];

  const match = SYSTEM_TYPES.find(t => t.toLowerCase().replace(/_/g, '') === normalized.replace(/_/g, ''));
  if (match) return match;

  return null;
};

const isDocTypeMismatch = (selectedType, detectedType) => {
  if (!detectedType || !selectedType) return { mismatch: false };

  const mapped = normalizeDetectedType(detectedType);
  if (!mapped) return { mismatch: false, detectedNormalized: null };

  if (mapped !== selectedType) {
    return {
      mismatch: true,
      selected: selectedType,
      detected: detectedType,
      detectedNormalized: mapped,
      message: `Selected document type is "${selectedType}" but the uploaded document appears to be "${mapped}". Please upload the correct document.`,
    };
  }

  return { mismatch: false, detectedNormalized: mapped };
};

module.exports = { normalizeDetectedType, isDocTypeMismatch, SYSTEM_TYPES, GEMINI_TYPE_MAP };