const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const logDir = path.join(__dirname, '../logs');

const transport = new winston.transports.DailyRotateFile({
  filename: 'biletapp-%DATE%.log',
  dirname: logDir,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production' 
      ? winston.format.json() 
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, stack }) => {
            return `${timestamp} [${level}]: ${message} ${stack || ''}`;
          })
        )
  ),
  transports: [
    transport,
    new winston.transports.Console()
  ],
});

module.exports = logger;
