/**
 * AI Cost Tracker - Track and persist AI API costs
 * 
 * Tracks per-request costs for Gemini API.
 * Saves cost records to a local JSON file for persistence.
 */

import { promises as fs } from 'fs'
import path from 'path'
import { MODEL_PRICING } from '../types'
import { logger } from './logger'

// Define minimal required types locally to avoid dependency issues during rewrite
type ProviderName = 'gemini' | string
type UseCase = string

export interface CostRecord {
  id: string
  timestamp: string
  provider: ProviderName
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  latencyMs: number
  useCase?: UseCase
  cached?: boolean
}

export interface CostSummary {
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
  byProvider: Record<string, {
    cost: number
    inputTokens: number
    outputTokens: number
    requests: number
  }>
  byModel: Record<string, {
    cost: number
    inputTokens: number
    outputTokens: number
    requests: number
  }>
}

const COST_FILE_PATH = path.join(process.cwd(), 'data', 'ai-costs.json')
const MAX_RECORDS = 10000 // Keep last 10k records

interface CostData {
  records: CostRecord[]
  lastUpdated: string
}

class CostTracker {
  private records: CostRecord[] = []
  private initialized = false
  private saveDebounceTimer: NodeJS.Timeout | null = null

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      await this.ensureDataDirectory()
      const data = await this.loadRecords()
      this.records = data.records
      this.initialized = true
      logger.info('CostTracker', 'Initialized', { recordCount: this.records.length })
    } catch (error) {
      logger.warn('CostTracker', 'Failed to load existing records, starting fresh', { error: String(error) })
      this.records = []
      this.initialized = true
    }
  }

  async recordCost(params: {
    provider: ProviderName
    model: string
    inputTokens: number
    outputTokens: number
    latencyMs: number
    useCase?: UseCase
    cached?: boolean
  }): Promise<CostRecord> {
    await this.initialize()

    const { inputCost, outputCost, totalCost } = this.calculateCost(
      params.model,
      params.inputTokens,
      params.outputTokens
    )

    const record: CostRecord = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      provider: params.provider,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.inputTokens + params.outputTokens,
      inputCost,
      outputCost,
      totalCost,
      latencyMs: params.latencyMs,
      useCase: params.useCase,
      cached: params.cached,
    }

    this.records.push(record)

    if (this.records.length > MAX_RECORDS) {
      this.records = this.records.slice(-MAX_RECORDS)
    }

    this.debouncedSave()

    logger.debug('CostTracker', 'Recorded cost', {
      model: params.model,
      totalTokens: record.totalTokens,
      cost: `$${totalCost.toFixed(6)}`,
    })

    return record
  }

  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): { inputCost: number; outputCost: number; totalCost: number } {
    const pricing = MODEL_PRICING[model] || { inputPer1kTokens: 0, outputPer1kTokens: 0 }

    const inputCost = (inputTokens / 1000) * pricing.inputPer1kTokens
    const outputCost = (outputTokens / 1000) * pricing.outputPer1kTokens
    const totalCost = inputCost + outputCost

    return { inputCost, outputCost, totalCost }
  }

  getTotalCost(): number {
    return this.records.reduce((sum, r) => sum + r.totalCost, 0)
  }

  getCostByProvider(provider: ProviderName): number {
    return this.records
      .filter(r => r.provider === provider)
      .reduce((sum, r) => sum + r.totalCost, 0)
  }

  getCostByModel(model: string): number {
    return this.records
      .filter(r => r.model === model)
      .reduce((sum, r) => sum + r.totalCost, 0)
  }

  getCostsSince(date: Date): number {
    const timestamp = date.toISOString()
    return this.records
      .filter(r => r.timestamp >= timestamp)
      .reduce((sum, r) => sum + r.totalCost, 0)
  }

  getSummary(): CostSummary {
    const summary: CostSummary = {
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalRequests: this.records.length,
      byProvider: {},
      byModel: {},
    }

    for (const record of this.records) {
      summary.totalCost += record.totalCost
      summary.totalInputTokens += record.inputTokens
      summary.totalOutputTokens += record.outputTokens

      // By provider
      if (!summary.byProvider[record.provider]) {
        summary.byProvider[record.provider] = {
          cost: 0,
          inputTokens: 0,
          outputTokens: 0,
          requests: 0,
        }
      }
      summary.byProvider[record.provider].cost += record.totalCost
      summary.byProvider[record.provider].inputTokens += record.inputTokens
      summary.byProvider[record.provider].outputTokens += record.outputTokens
      summary.byProvider[record.provider].requests++

      // By model
      if (!summary.byModel[record.model]) {
        summary.byModel[record.model] = {
          cost: 0,
          inputTokens: 0,
          outputTokens: 0,
          requests: 0,
        }
      }
      summary.byModel[record.model].cost += record.totalCost
      summary.byModel[record.model].inputTokens += record.inputTokens
      summary.byModel[record.model].outputTokens += record.outputTokens
      summary.byModel[record.model].requests++
    }

    return summary
  }

  getRecentRecords(limit = 100): CostRecord[] {
    return this.records.slice(-limit).reverse()
  }

  getAllRecords(): CostRecord[] {
    return [...this.records]
  }

  async clearRecords(): Promise<void> {
    this.records = []
    await this.saveRecords()
    logger.info('CostTracker', 'Cleared all cost records')
  }

  async save(): Promise<void> {
    await this.saveRecords()
  }

  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(COST_FILE_PATH)
    try {
      await fs.access(dataDir)
    } catch {
      await fs.mkdir(dataDir, { recursive: true })
    }
  }

  private async loadRecords(): Promise<CostData> {
    try {
      const content = await fs.readFile(COST_FILE_PATH, 'utf-8')
      return JSON.parse(content) as CostData
    } catch {
      return { records: [], lastUpdated: new Date().toISOString() }
    }
  }

  private async saveRecords(): Promise<void> {
    await this.ensureDataDirectory()
    const data: CostData = {
      records: this.records,
      lastUpdated: new Date().toISOString(),
    }
    await fs.writeFile(COST_FILE_PATH, JSON.stringify(data, null, 2))
  }

  private debouncedSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.saveRecords().catch(err => {
        logger.error('CostTracker', 'Failed to save records', { error: String(err) })
      })
    }, 1000)
  }

  private generateId(): string {
    return `cost_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

// Singleton instance
let trackerInstance: CostTracker | null = null

export function getCostTracker(): CostTracker {
  if (!trackerInstance) {
    trackerInstance = new CostTracker()
  }
  return trackerInstance
}

export { CostTracker }
