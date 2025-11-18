/**
 * Centralized logging service for Rainy Aether
 * Provides structured logging with log levels and conditional output based on environment
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  minLevel: LogLevel;
  enableTimestamps: boolean;
  enableStackTrace: boolean;
}

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    const isDev = import.meta.env.DEV;
    this.config = {
      minLevel: isDev ? 'debug' : 'info',
      enableTimestamps: true,
      enableStackTrace: false,
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return logLevels[level] >= logLevels[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, context: string, ...args: unknown[]): unknown[] {
    const parts: unknown[] = [];

    if (this.config.enableTimestamps) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      parts.push(`[${timestamp}]`);
    }

    parts.push(`[${level.toUpperCase()}]`);

    if (context) {
      parts.push(`[${context}]`);
    }

    parts.push(...args);

    return parts;
  }

  debug(context: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;
    console.log(...this.formatMessage('debug', context, ...args));
  }

  info(context: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    console.log(...this.formatMessage('info', context, ...args));
  }

  warn(context: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;
    console.warn(...this.formatMessage('warn', context, ...args));
  }

  error(context: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return;
    console.error(...this.formatMessage('error', context, ...args));

    if (this.config.enableStackTrace && args[0] instanceof Error) {
      console.error((args[0] as Error).stack);
    }
  }

  // Performance timing utilities
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(label);
    }
  }

  // Group utilities for nested logging
  group(label: string): void {
    if (this.shouldLog('debug')) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.shouldLog('debug')) {
      console.groupEnd();
    }
  }

  // Update config at runtime
  setLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  enableStackTrace(enable: boolean): void {
    this.config.enableStackTrace = enable;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions that match common usage patterns
export const log = {
  debug: (context: string, ...args: unknown[]) => logger.debug(context, ...args),
  info: (context: string, ...args: unknown[]) => logger.info(context, ...args),
  warn: (context: string, ...args: unknown[]) => logger.warn(context, ...args),
  error: (context: string, ...args: unknown[]) => logger.error(context, ...args),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
  group: (label: string) => logger.group(label),
  groupEnd: () => logger.groupEnd(),
};

// Export default logger instance
export default logger;
