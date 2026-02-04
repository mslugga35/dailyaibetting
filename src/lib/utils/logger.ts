/**
 * Logger Utility
 * Centralized logging with environment-aware log levels
 * @module lib/utils/logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Get current log level from environment
 * Defaults to 'info' in production, 'debug' in development
 */
function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL as LogLevel;
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * Format log message with timestamp and prefix
 */
function formatMessage(prefix: string, message: string): string {
  return `[${prefix}] ${message}`;
}

/**
 * Logger instance with debug, info, warn, error methods
 * 
 * @example
 * import { logger } from '@/lib/utils/logger';
 * 
 * logger.debug('Consensus', 'Processing picks...');
 * logger.info('Schedule', `Found ${count} games`);
 * logger.warn('Parser', 'Unknown format detected');
 * logger.error('API', 'Failed to fetch data', error);
 */
export const logger = {
  /**
   * Debug level logging - only in development
   */
  debug: (prefix: string, message: string, ...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.log(formatMessage(prefix, message), ...args);
    }
  },

  /**
   * Info level logging - general information
   */
  info: (prefix: string, message: string, ...args: unknown[]) => {
    if (shouldLog('info')) {
      console.log(formatMessage(prefix, message), ...args);
    }
  },

  /**
   * Warning level logging - potential issues
   */
  warn: (prefix: string, message: string, ...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage(prefix, message), ...args);
    }
  },

  /**
   * Error level logging - always logged
   */
  error: (prefix: string, message: string, ...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(formatMessage(prefix, message), ...args);
    }
  },
};

export default logger;
