import { promises as fs } from 'fs'
import * as path from 'path'

interface QueryLog {
  id: string
  timestamp: string
  useCase: string
  provider: string
  model: string
  prompt: string
  success: boolean
  error?: string
  latencyMs: number
  tokensUsed?: number
}

interface QueryStats {
  total: number
  success: number
  failed: number
  errorRate: number
  avgLatency: number
  byProvider: Record<string, { total: number; success: number; failed: number }>
  byUseCase: Record<string, { total: number; success: number; failed: number }>
  recentErrors: QueryLog[]
}

const QUERY_LOG_FILE = path.join(process.cwd(), 'data', 'ai-query-logs.json')
const MAX_LOGS = 1000

async function ensureLogFile() {
  try {
    await fs.mkdir(path.dirname(QUERY_LOG_FILE), { recursive: true })
    try {
      await fs.access(QUERY_LOG_FILE)
    } catch {
      await fs.writeFile(QUERY_LOG_FILE, JSON.stringify({ logs: [] }, null, 2))
    }
  } catch (error) {
    console.error('Failed to ensure query log file:', error)
  }
}

export async function logQuery(log: Omit<QueryLog, 'id' | 'timestamp'>) {
  try {
    await ensureLogFile()
    
    const data = await fs.readFile(QUERY_LOG_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    
    const newLog: QueryLog = {
      ...log,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
    }
    
    parsed.logs.unshift(newLog)
    
    if (parsed.logs.length > MAX_LOGS) {
      parsed.logs = parsed.logs.slice(0, MAX_LOGS)
    }
    
    await fs.writeFile(QUERY_LOG_FILE, JSON.stringify(parsed, null, 2))
  } catch (error) {
    console.error('Failed to log query:', error)
  }
}

export async function getQueryLogs(limit = 100): Promise<QueryLog[]> {
  try {
    await ensureLogFile()
    const data = await fs.readFile(QUERY_LOG_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    return parsed.logs.slice(0, limit)
  } catch (error) {
    console.error('Failed to get query logs:', error)
    return []
  }
}

export async function getQueryStats(): Promise<QueryStats> {
  try {
    const logs = await getQueryLogs(MAX_LOGS)
    
    const total = logs.length
    const success = logs.filter(l => l.success).length
    const failed = total - success
    const errorRate = total > 0 ? (failed / total) * 100 : 0
    const avgLatency = total > 0 ? logs.reduce((sum, l) => sum + l.latencyMs, 0) / total : 0
    
    const byProvider: Record<string, { total: number; success: number; failed: number }> = {}
    const byUseCase: Record<string, { total: number; success: number; failed: number }> = {}
    
    logs.forEach(log => {
      if (!byProvider[log.provider]) {
        byProvider[log.provider] = { total: 0, success: 0, failed: 0 }
      }
      byProvider[log.provider].total++
      if (log.success) {
        byProvider[log.provider].success++
      } else {
        byProvider[log.provider].failed++
      }
      
      if (!byUseCase[log.useCase]) {
        byUseCase[log.useCase] = { total: 0, success: 0, failed: 0 }
      }
      byUseCase[log.useCase].total++
      if (log.success) {
        byUseCase[log.useCase].success++
      } else {
        byUseCase[log.useCase].failed++
      }
    })
    
    const recentErrors = logs.filter(l => !l.success).slice(0, 20)
    
    return {
      total,
      success,
      failed,
      errorRate,
      avgLatency,
      byProvider,
      byUseCase,
      recentErrors
    }
  } catch (error) {
    console.error('Failed to get query stats:', error)
    return {
      total: 0,
      success: 0,
      failed: 0,
      errorRate: 0,
      avgLatency: 0,
      byProvider: {},
      byUseCase: {},
      recentErrors: []
    }
  }
}
