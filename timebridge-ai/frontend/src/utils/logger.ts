type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogData {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: LogData;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    status?: number;
    url?: string;
  };
}

class Logger {
  private isDevelopment: boolean;
  private loggingEndpoint: string;
  private queue: LogEntry[] = [];
  private isProcessing = false;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.loggingEndpoint = process.env.NEXT_PUBLIC_LOGGING_SERVICE_URL || 'https://logging.timebridge.ai/logs';
  }

  private log(level: LogLevel, message: string, data?: LogData, error?: Error & { status?: number; url?: string }): void {
    const timestamp = new Date().toISOString();
    
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      data,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          status: error.status,
          url: error.url
        }
      })
    };

    if (this.isDevelopment) {
      const logMessage = `${timestamp} ${message}${error?.url ? ` (${error.url})` : ''}`;
      this.consoleLog(level, logMessage, data, error);
    }

    if (!this.isDevelopment) {
      this.queue.push(logEntry);
      void this.processQueue();
    }
  }

  private consoleLog(level: LogLevel, message: string, data?: LogData, error?: Error): void {
    const args = [
      `${level === 'error' ? '🔴' : level === 'warn' ? '🟡' : level === 'info' ? '🔵' : '⚪'} [${level.toUpperCase()}] ${message}`,
      ...(data ? [data] : []),
      ...(error ? ['\n', error] : [])
    ];

    switch (level) {
      case 'info':
        console.log(...args);
        break;
      case 'warn':
        console.warn(...args);
        break;
      case 'error':
        console.error(...args);
        break;
      case 'debug':
        console.debug(...args);
        break;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, 10);
        await this.sendToExternalLogger(batch);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.error('Failed to process log queue', { queueSize: this.queue.length }, error);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendToExternalLogger(entries: LogEntry[]): Promise<void> {
    try {
      const response = await fetch(this.loggingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_LOGGING_API_KEY || '',
        },
        body: JSON.stringify({ logs: entries }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      if (this.isDevelopment && error instanceof Error) {
        this.error('Failed to send logs to external service', undefined, error);
      }
      throw error;
    }
  }

  info(message: string, data?: LogData): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: LogData): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: LogData, error?: Error & { status?: number; url?: string }): void {
    this.log('error', message, data, error);
  }

  debug(message: string, data?: LogData): void {
    this.log('debug', message, data);
  }
}

export const logger = new Logger(); 