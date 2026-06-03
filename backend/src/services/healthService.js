const os = require('os');

const getHealthStatus = () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development',
    system: {
      platform: os.platform(),
      nodeVersion: process.version,
      memoryUsage: {
        total: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        free: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
      },
    },
  };
};

module.exports = { getHealthStatus };
