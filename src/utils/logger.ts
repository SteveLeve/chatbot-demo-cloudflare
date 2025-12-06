/**
 * Structured logging utility
 * Provides context-aware logging with performance timers
 */

import type { LogLevel, LogEntry } from '../types';

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export class Logger {
  private context: Record<string, any>;
  private timers: Map<string, number>;
  private minLevel: LogLevel;

  constructor(context: Record<string, any> = {}, minLevel: LogLevel = 'INFO') {
    this.context = context;
    this.timers = new Map();
    this.minLevel = minLevel;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Record<string, any>): Logger {
    return new Logger(
      { ...this.context, ...additionalContext },
      this.minLevel
    );
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('DEBUG', message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('INFO', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('WARN', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
    const errorContext = error instanceof Error
      ? {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          ...context,
        }
      : { error, ...context };

    this.log('ERROR', message, errorContext);
  }

  /**
   * Start a performance timer
   */
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
    this.debug(`Timer started: ${name}`);
  }

  /**
   * End a performance timer and log the duration
   */
  endTimer(name: string, context?: Record<string, any>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      this.warn(`Timer "${name}" was never started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    this.info(`Timer ended: ${name}`, {
      durationMs: duration,
      ...context,
    });

    return duration;
  }

  /**
   * Internal logging implementation
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Check if this log level should be output
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context: { ...this.context, ...context },
      timestamp: new Date().toISOString(),
    };

    // Format for console output
    const formatted = this.format(entry);

    // Output to appropriate console method
    switch (level) {
      case 'DEBUG':
      case 'INFO':
        console.log(formatted);
        break;
      case 'WARN':
        console.warn(formatted);
        break;
      case 'ERROR':
        console.error(formatted);
        break;
    }
  }

  /**
   * Format log entry for output
   */
  private format(entry: LogEntry): string {
    const contextStr = Object.keys(entry.context || {}).length > 0
      ? ` ${JSON.stringify(entry.context)}`
      : '';

    return `[${entry.timestamp}] ${entry.level}: ${entry.message}${contextStr}`;
  }

  /**
   * Set the minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

/**
 * Create a logger instance
 */
export function createLogger(
  context?: Record<string, any>,
  minLevel?: LogLevel
): Logger {
  return new Logger(context, minLevel);
}
