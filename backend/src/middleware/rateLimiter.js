const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const ocrLimiter = createRateLimiter(
  60 * 1000, 10,
  'OCR rate limit exceeded (10 per minute). Please wait before extracting more documents.'
);

const uploadLimiter = createRateLimiter(
  60 * 1000, 20,
  'Upload rate limit exceeded (20 per minute).'
);

const defaultLimiter = createRateLimiter(
  60 * 1000, 60,
  'Too many requests, please try again later.'
);

module.exports = { ocrLimiter, uploadLimiter, defaultLimiter };