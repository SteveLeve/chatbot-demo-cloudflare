/**
 * Structured logging utility
 * Provides context-aware logging with performance timers
 */

import type { LogLevel, LogEntry, Env } from '../types';
import type { Context } from 'hono';

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
    const {
      requestId,
      traceId,
      spanId,
      sessionId,
      ...restContext
    } = entry.context || {};

    const payload: Record<string, any> = {
      ts: entry.timestamp,
      level: entry.level,
      msg: entry.message,
    };

    if (requestId) payload.requestId = requestId;
    if (traceId) payload.traceId = traceId;
    if (spanId) payload.spanId = spanId;
    if (sessionId) payload.sessionId = sessionId;

    if (restContext && Object.keys(restContext).length > 0) {
      payload.context = restContext;
    }

    return JSON.stringify(payload);
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

/**
 * Create a request-scoped logger that carries request/trace context automatically.
 */
export function createRequestLogger(
  c: Context<{ Bindings: Env }>,
  context: Record<string, any> = {}
): Logger {
  const requestId = c.get('requestId') as string | undefined;
  const trace = c.get('traceContext') as
    | { traceId?: string; spanId?: string }
    | undefined;
  const baseLevel = c.env?.LOG_LEVEL || 'INFO';

  return new Logger(
    {
      requestId,
      traceId: trace?.traceId,
      spanId: trace?.spanId,
      ...context,
    },
    baseLevel
  );
}
