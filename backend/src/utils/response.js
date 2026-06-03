/**
 * Standard API response helpers
 */

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendCreated = (res, data = null, message = 'Created successfully') => {
  return sendSuccess(res, data, message, 201);
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const payload = {
    success: false,
    message,
  };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, message, 404);
};

const sendBadRequest = (res, message = 'Bad request', errors = null) => {
  return sendError(res, message, 400, errors);
};

const sendUnauthorized = (res, message = 'Unauthorized') => {
  return sendError(res, message, 401);
};

const sendForbidden = (res, message = 'Forbidden') => {
  return sendError(res, message, 403);
};

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
};
