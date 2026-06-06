const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const securityLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'eldreach-security' },
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/security.log') }),
    // Also log warnings and errors to a separate error log
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/error.log'), level: 'error' }),
  ],
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  securityLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

module.exports = securityLogger;
