const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const PORT = config.server.port;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${config.server.env} mode on port ${PORT}`);
});

const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed. Process terminating.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message, err.stack);
  gracefulShutdown('uncaughtException');
});

module.exports = server;