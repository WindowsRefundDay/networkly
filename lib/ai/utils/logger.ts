/**
 * AI Logger - Structured logging for AI operations
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  component: string
  message: string
  metadata?: Record<string, unknown>
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

class AILogger {
  private minLevel: LogLevel = 'info'
  private enabled: boolean = true

  configure(options: { level?: LogLevel; enabled?: boolean }) {
    if (options.level) this.minLevel = options.level
    if (options.enabled !== undefined) this.enabled = options.enabled
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enabled && LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel]
  }

  private formatEntry(entry: LogEntry): string {
    const meta = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : ''
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.component}] ${entry.message}${meta}`
  }

  private log(level: LogLevel, component: string, message: string, metadata?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      metadata,
    }

    const formatted = this.formatEntry(entry)

    switch (level) {
      case 'debug':
        console.debug(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }

  debug(component: string, message: string, metadata?: Record<string, unknown>) {
    this.log('debug', component, message, metadata)
  }

  info(component: string, message: string, metadata?: Record<string, unknown>) {
    this.log('info', component, message, metadata)
  }

  warn(component: string, message: string, metadata?: Record<string, unknown>) {
    this.log('warn', component, message, metadata)
  }

  error(component: string, message: string, metadata?: Record<string, unknown>) {
    this.log('error', component, message, metadata)
  }

  // Specialized logging methods for AI operations
  request(provider: string, model: string, metadata?: Record<string, unknown>) {
    this.debug('AIRequest', `Request to ${provider}/${model}`, metadata)
  }

  response(provider: string, model: string, latencyMs: number, metadata?: Record<string, unknown>) {
    this.info('AIResponse', `Response from ${provider}/${model} in ${latencyMs}ms`, metadata)
  }

  retry(provider: string, attempt: number, maxAttempts: number, error: string) {
    this.warn('AIRetry', `Retry ${attempt}/${maxAttempts} for ${provider}`, { error })
  }

  fallback(fromModel: string, toModel: string, reason: string) {
    this.warn('AIFallback', `Falling back from ${fromModel} to ${toModel}`, { reason })
  }

  healthCheck(provider: string, healthy: boolean, latencyMs: number) {
    const level = healthy ? 'debug' : 'warn'
    this.log(level, 'AIHealth', `Health check for ${provider}: ${healthy ? 'healthy' : 'unhealthy'}`, { latencyMs })
  }

  rateLimit(provider: string, retryAfter?: number) {
    this.warn('AIRateLimit', `Rate limited by ${provider}`, { retryAfter })
  }
}

export const logger = new AILogger()
