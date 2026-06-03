const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const PORT = config.server.port;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${config.server.env} mode on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => process.exit(1));
});

module.exports = server;
