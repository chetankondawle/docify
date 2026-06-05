require('dotenv').config();

const REQUIRED_ENV_VARS = ['HACKDNA_API_KEY'];

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
  hackdna: {
    apiKey: process.env.HACKDNA_API_KEY,
    baseUrl: process.env.HACKDNA_BASE_URL || 'https://hack.fyndna.com/api/v1',
    model: process.env.HACKDNA_MODEL || 'google/gemini-2.5-flash-lite',
    sourceEmail: process.env.HACKDNA_SOURCE_EMAIL || '',
    maxRetries: parseInt(process.env.HACKDNA_MAX_RETRIES, 10) || 1,
    timeoutMs: parseInt(process.env.HACKDNA_TIMEOUT_MS, 10) || 30000,
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 10 * 1024 * 1024,
    maxBodySize: parseInt(process.env.MAX_BODY_SIZE_BYTES, 10) || 1024 * 1024,
  },
};

module.exports = config;