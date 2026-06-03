const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[${req.method}] ${req.path} >> StatusCode: ${statusCode}, Message: ${message}`);

  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      success: false,
      message,
      stack: err.stack,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal Server Error' : message,
  });
};

module.exports = errorHandler;
