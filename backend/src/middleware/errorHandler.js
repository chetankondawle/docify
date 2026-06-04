const logger = require('../utils/logger');
const config = (() => { try { return require('../config'); } catch { return null; } })();

const errorHandler = (err, req, res, next) => {
  const safeErr = err || {};
  const statusCode = safeErr.statusCode || safeErr.status || 500;
  const message = safeErr.message || 'Internal Server Error';

  logger.error(`[${req.method}] ${req.path} >> ${statusCode}: ${message}`);

  if (config?.server?.env === 'development') {
    return res.status(statusCode).json({
      success: false,
      message,
      stack: safeErr.stack,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal Server Error' : message,
  });
};

module.exports = errorHandler;