const logger = require('./logger');

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

const FORMATS = {
  AADHAAR: /^\d{4}\s?\d{4}\s?\d{4}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  PASSPORT: /^[A-Z]\d{7}$/,
  PINCODE: /^\d{6}$/,
  MOBILE: /^\d{10}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

const validateFormat = (value, formatName) => {
  if (!value || typeof value !== 'string') return { valid: false, error: 'Value is missing or not a string' };

  const regex = FORMATS[formatName];
  if (!regex) return { valid: true };

  const cleaned = value.replace(/\s/g, '').toUpperCase();
  const isMatch = regex.test(cleaned);

  if (!isMatch) {
    return {
      valid: false,
      error: `Value does not match expected ${formatName} format`,
      expected: regex.toString(),
    };
  }

  return { valid: true };
};

const validateDate = (value, formats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY']) => {
  if (!value) return { valid: false, error: 'Date value is missing' };

  const str = String(value).trim();

  const patterns = [
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, parse: (m) => `${m[1]}-${m[2]}-${m[3]}` },
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, parse: (m) => `${m[3]}-${m[2]}-${m[1]}` },
    { regex: /^(\d{2})-(\d{2})-(\d{4})$/, parse: (m) => `${m[3]}-${m[2]}-${m[1]}` },
    { regex: /^(\d{4})\/(\d{2})\/(\d{2})$/, parse: (m) => `${m[1]}-${m[2]}-${m[3]}` },
  ];

  for (const { regex, parse } of patterns) {
    const match = str.match(regex);
    if (match) {
      const normalized = parse(match);
      const d = new Date(normalized);
      if (!isNaN(d.getTime())) {
        return { valid: true, normalized };
      }
    }
  }

  return { valid: false, error: `Date does not match any expected format (${formats.join(', ')})` };
};

const validateNumeric = (value) => {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'Numeric value is missing' };
  }

  const cleaned = String(value).replace(/[₹$,€\s]/g, '').trim();

  if (cleaned === '') return { valid: false, error: 'Empty after removing currency symbols' };

  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return { valid: false, error: `"${value}" is not a valid number` };
  }

  return { valid: true, parsed: num };
};

const validateNotEmpty = (value) => {
  if (!value) return { valid: false, error: 'Value is empty or missing' };
  const str = String(value).trim();
  if (str.length === 0) return { valid: false, error: 'Value is empty string' };
  if (str.length < 2) return { valid: false, error: 'Value is too short to be meaningful' };
  return { valid: true };
};

const validateMonthYear = (value) => {
  if (!value) return { valid: false, error: 'Month/Year value is missing' };

  const str = String(value).trim().toLowerCase();

  // Pattern 1: "Month YYYY" (e.g., "January 2024", "Jan 2024")
  const monthYearRegex = /^([a-z]+)\s+(\d{4})$/;
  const match = str.match(monthYearRegex);
  if (match) {
    const monthName = match[1];
    const year = match[2];
    if (MONTHS.includes(monthName)) {
      return { valid: true, normalized: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}` };
    }
  }

  // Pattern 2: "MM/YYYY" or "YYYY-MM"
  const numericPatterns = [
    { regex: /^(\d{2})\/(\d{4})$/, parse: (m) => `${m[1]}/${m[2]}`, monthIdx: 1, yearIdx: 2 },
    { regex: /^(\d{4})-(\d{2})$/, parse: (m) => `${m[2]}/${m[1]}`, monthIdx: 2, yearIdx: 1 },
  ];

  for (const { regex, parse, monthIdx, yearIdx } of numericPatterns) {
    const numMatch = str.match(regex);
    if (numMatch) {
      const month = parseInt(numMatch[monthIdx], 10);
      const year = parseInt(numMatch[yearIdx], 10);
      if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return { valid: true, normalized: parse(numMatch) };
      }
    }
  }

  // Pattern 3: "MMM-YYYY" (e.g., "Jan-2024")
  const shortRegex = /^([a-z]{3})-(\d{4})$/;
  const shortMatch = str.match(shortRegex);
  if (shortMatch) {
    const monthName = shortMatch[1];
    const year = shortMatch[2];
    if (MONTHS.includes(monthName)) {
      return { valid: true, normalized: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}` };
    }
  }

  return { valid: false, error: `"${value}" does not match expected month/year format (e.g., "January 2024", "01/2024", "2024-01")` };
};

module.exports = {
  FORMATS,
  validateFormat,
  validateDate,
  validateNumeric,
  validateNotEmpty,
  validateMonthYear,
};