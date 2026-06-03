const healthService = require('../services/healthService');
const { sendSuccess } = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Health check endpoint
 * @route   GET /api/v1/health
 * @access  Public
 */
const getHealth = asyncHandler(async (req, res) => {
  const healthData = healthService.getHealthStatus();
  sendSuccess(res, healthData, 'Service is healthy');
});

module.exports = { getHealth };
