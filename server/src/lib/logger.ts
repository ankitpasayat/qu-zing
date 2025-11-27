import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Determine log directory based on environment
// In serverless environments (Vercel), use /tmp which is writable
// In development, use local logs directory
const _isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';
const logDir = isVercel ? '/tmp/logs' : path.join(process.cwd(), 'logs');

// Create log directory if it doesn't exist (only in writable environments)
const createLogDir = () => {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    return true;
  } catch (error) {
    // If we can't create the directory, we'll skip file logging
    console.warn('Unable to create log directory, file logging disabled:', error);
    return false;
  }
};

// Custom format for timestamps
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// Build transports array
const transports: winston.transport[] = [
  // Always write logs to console (this works in all environments)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      customFormat
    ),
  }),
];

// Only add file transports if we can create the log directory
const canWriteFiles = createLogDir();
if (canWriteFiles) {
  transports.push(
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write errors to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports,
});

// Helper functions to maintain existing log format
export const log = {
  info: (message: string, data?: unknown) => {
    const msg = data ? `${message} ${JSON.stringify(data, null, 2)}` : message;
    logger.info(msg);
  },
  error: (message: string, error?: unknown) => {
    const err = error as Error | undefined;
    const msg = err instanceof Error 
      ? `${message} ${err.message}` 
      : error 
        ? `${message} ${JSON.stringify(error, null, 2)}` 
        : message;
    logger.error(msg, { stack: err?.stack });
  },
  warn: (message: string, data?: unknown) => {
    const msg = data ? `${message} ${JSON.stringify(data, null, 2)}` : message;
    logger.warn(msg);
  },
  debug: (message: string, data?: unknown) => {
    const msg = data ? `${message} ${JSON.stringify(data, null, 2)}` : message;
    logger.debug(msg);
  },
};
