const config = require('../config');

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = config.server.env === 'production' ? 'info' : 'debug';

const colorMap = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m',  // yellow
  info: '\x1b[36m',  // cyan
  debug: '\x1b[37m', // white
};
const reset = '\x1b[0m';

const logger = {
  _log(level, ...args) {
    if (levels[level] <= levels[currentLevel]) {
      const timestamp = new Date().toISOString();
      const color = colorMap[level] || reset;
      console[level === 'error' ? 'error' : 'log'](
        `${color}[${timestamp}] [${level.toUpperCase()}]${reset}`,
        ...args
      );
    }
  },
  error: (...args) => logger._log('error', ...args),
  warn: (...args) => logger._log('warn', ...args),
  info: (...args) => logger._log('info', ...args),
  debug: (...args) => logger._log('debug', ...args),
};

module.exports = logger;
