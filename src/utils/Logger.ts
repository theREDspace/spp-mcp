/**
 * Logger utility class for RSS SPP Client library
 * Provides centralized logging with configurable log levels and namespace support
 */

export type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error' | 'none';

export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix: string;
}

export interface LoggerOptions {
  enabled?: boolean;
  level?: LogLevel;
}

/**
 * Centralized logger for the RSS SPP Client library
 * All logs are prefixed with [RSSPPC] to identify library output
 *
 * Usage:
 * ```typescript
 * Logger.log('DB', 'Connected to database');
 * Logger.error('SPPClient', 'Failed to fetch data', error);
 * Logger.debug('AuthManager', 'Token refresh initiated');
 *
 * // Configure globally
 * Logger.configure({ enabled: false }); // Disable all logging
 * Logger.configure({ level: 'error' }); // Only show errors
 * ```
 */
export class Logger {
  private static config: LoggerConfig = {
    enabled: false,
    level: 'debug',
    prefix: '[RSSPPC]'
  };

  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    log: 2,
    warn: 3,
    error: 4,
    none: 5
  };

  /**
   * Configure the logger
   * @param config Partial configuration to merge with current config
   */
  static configure(config: Partial<LoggerConfig>): void {
    Logger.config = { ...Logger.config, ...config };
  }

  /**
   * Get current logger configuration
   */
  static getConfig(): Readonly<LoggerConfig> {
    return { ...Logger.config };
  }

  /**
   * Enable logging
   */
  static enable(): void {
    Logger.config.enabled = true;
  }

  /**
   * Disable logging
   */
  static disable(): void {
    Logger.config.enabled = false;
  }

  /**
   * Set the minimum log level
   * @param level Minimum level to log (debug, info, log, warn, error, none)
   */
  static setLevel(level: LogLevel): void {
    Logger.config.level = level;
  }

  /**
   * Check if a log level should be output based on current configuration
   */
  private static shouldLog(level: LogLevel): boolean {
    if (!Logger.config.enabled) return false;
    return Logger.LOG_LEVELS[level] >= Logger.LOG_LEVELS[Logger.config.level];
  }

  /**
   * Format the log message with prefix and namespace
   */
  private static formatMessage(namespace: string, message: string): string {
    return `${Logger.config.prefix}${namespace ? ` [${namespace}]` : ''} ${message}`;
  }

  /**
   * Debug level logging
   * @param namespace Module or component name (e.g., 'DB', 'SPPClient')
   * @param message Log message
   * @param args Additional arguments to log
   */
  static debug(namespace: string, message: string, ...args: any[]): void {
    if (Logger.shouldLog('debug')) {
      console.debug(Logger.formatMessage(namespace, message), ...args);
    }
  }

  /**
   * Info level logging
   * @param namespace Module or component name (e.g., 'DB', 'SPPClient')
   * @param message Log message
   * @param args Additional arguments to log
   */
  static info(namespace: string, message: string, ...args: any[]): void {
    if (Logger.shouldLog('info')) {
      console.info(Logger.formatMessage(namespace, message), ...args);
    }
  }

  /**
   * Standard log level logging
   * @param namespace Module or component name (e.g., 'DB', 'SPPClient')
   * @param message Log message
   * @param args Additional arguments to log
   */
  static log(namespace: string, message: string, ...args: any[]): void {
    if (Logger.shouldLog('log')) {
      console.log(Logger.formatMessage(namespace, message), ...args);
    }
  }

  /**
   * Warning level logging
   * @param namespace Module or component name (e.g., 'DB', 'SPPClient')
   * @param message Log message
   * @param args Additional arguments to log
   */
  static warn(namespace: string, message: string, ...args: any[]): void {
    if (Logger.shouldLog('warn')) {
      console.warn(Logger.formatMessage(namespace, message), ...args);
    }
  }

  /**
   * Error level logging
   * @param namespace Module or component name (e.g., 'DB', 'SPPClient')
   * @param message Log message
   * @param args Additional arguments to log
   */
  static error(namespace: string, message: string, ...args: any[]): void {
    if (Logger.shouldLog('error')) {
      console.error(Logger.formatMessage(namespace, message), ...args);
    }
  }

  /**
   * Log without namespace (just prefix)
   * @param message Log message
   * @param args Additional arguments to log
   */
  static logSimple(message: string, ...args: any[]): void {
    if (Logger.shouldLog('log')) {
      console.log(`${Logger.config.prefix} ${message}`, ...args);
    }
  }

  /**
   * Error without namespace (just prefix)
   * @param message Log message
   * @param args Additional arguments to log
   */
  static errorSimple(message: string, ...args: any[]): void {
    if (Logger.shouldLog('error')) {
      console.error(`${Logger.config.prefix} ${message}`, ...args);
    }
  }
}

// Convenience exports for common namespaces
export const DB = {
  log: (message: string, ...args: any[]) => Logger.log('DB', message, ...args),
  error: (message: string, ...args: any[]) => Logger.error('DB', message, ...args),
  debug: (message: string, ...args: any[]) => Logger.debug('DB', message, ...args),
  info: (message: string, ...args: any[]) => Logger.info('DB', message, ...args),
  warn: (message: string, ...args: any[]) => Logger.warn('DB', message, ...args),
};

export const SPPClient = {
  log: (message: string, ...args: any[]) => Logger.log('SPPClient', message, ...args),
  error: (message: string, ...args: any[]) => Logger.error('SPPClient', message, ...args),
  debug: (message: string, ...args: any[]) => Logger.debug('SPPClient', message, ...args),
  info: (message: string, ...args: any[]) => Logger.info('SPPClient', message, ...args),
  warn: (message: string, ...args: any[]) => Logger.warn('SPPClient', message, ...args),
};

export const Auth = {
  log: (message: string, ...args: any[]) => Logger.log('AuthManager', message, ...args),
  error: (message: string, ...args: any[]) => Logger.error('AuthManager', message, ...args),
  debug: (message: string, ...args: any[]) => Logger.debug('AuthManager', message, ...args),
  info: (message: string, ...args: any[]) => Logger.info('AuthManager', message, ...args),
  warn: (message: string, ...args: any[]) => Logger.warn('AuthManager', message, ...args),
};

export const BOService = {
  log: (message: string, ...args: any[]) => Logger.log('BOService', message, ...args),
  error: (message: string, ...args: any[]) => Logger.error('BOService', message, ...args),
  debug: (message: string, ...args: any[]) => Logger.debug('BOService', message, ...args),
  info: (message: string, ...args: any[]) => Logger.info('BOService', message, ...args),
  warn: (message: string, ...args: any[]) => Logger.warn('BOService', message, ...args),
};
