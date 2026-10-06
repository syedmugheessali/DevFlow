/**
 * Simple structured logger.
 * In production, replace with winston or pino if needed.
 * Avoids logging sensitive data.
 */
const config = require('../config');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = config.env === 'production' ? 'info' : 'debug';

function shouldLog(level) {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return [prefix, message, ...args];
}

const logger = {
  error(message, ...args) {
    if (shouldLog('error')) {
      console.error(...formatMessage('error', message, ...args));
    }
  },
  warn(message, ...args) {
    if (shouldLog('warn')) {
      console.warn(...formatMessage('warn', message, ...args));
    }
  },
  info(message, ...args) {
    if (shouldLog('info')) {
      console.log(...formatMessage('info', message, ...args));
    }
  },
  debug(message, ...args) {
    if (shouldLog('debug')) {
      console.log(...formatMessage('debug', message, ...args));
    }
  },
};

module.exports = logger;
