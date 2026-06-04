require('dotenv').config();

const REQUIRED_ENV_VARS = ['GEMINI_API_KEY'];

const missing = REQUIRED_ENV_VARS.filter(k => !process.env[k]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
    'Set them in a .env file or in the environment.'
  );
}

const config = {
  server: {
    env: process.env.NODE_ENV || 'development',
    port: (() => {
      const p = parseInt(process.env.PORT, 10);
      if (process.env.PORT && (isNaN(p) || p < 1 || p > 65535)) {
        throw new Error(`Invalid PORT: "${process.env.PORT}". Must be 1-65535.`);
      }
      return p || 5000;
    })(),
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:5173'],
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
    maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES, 10) || 3,
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 30000,
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 10 * 1024 * 1024,
    maxBodySize: parseInt(process.env.MAX_BODY_SIZE_BYTES, 10) || 1024 * 1024,
  },
};

module.exports = config;