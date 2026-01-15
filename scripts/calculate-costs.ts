#!/usr/bin/env npx ts-node

/**
 * AI Cost Calculator Script
 * 
 * Calculates and displays total AI API costs from the cost tracking data.
 * 
 * Usage:
 *   npx ts-node scripts/calculate-costs.ts
 *   pnpm costs
 */

import { promises as fs } from 'fs'
import path from 'path'

interface CostRecord {
  id: string
  timestamp: string
  provider: 'openrouter' | 'groq' | 'gemini'
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  latencyMs: number
  useCase?: string
  cached?: boolean
}

interface CostData {
  records: CostRecord[]
  lastUpdated: string
}

const COST_FILE_PATH = path.join(process.cwd(), 'data', 'ai-costs.json')

async function loadCostData(): Promise<CostData> {
  try {
    const content = await fs.readFile(COST_FILE_PATH, 'utf-8')
    return JSON.parse(content) as CostData
  } catch {
    return { records: [], lastUpdated: '' }
  }
}

function formatCurrency(amount: number): string {
  if (amount === 0) return '$0.00'
  if (amount < 0.01) return `$${amount.toFixed(6)}`
  return `$${amount.toFixed(4)}`
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function getTimeAgo(dateString: string): string {
  if (!dateString) return 'never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

async function main() {
  console.log('\n🤖 AI Cost Calculator\n')
  console.log('═'.repeat(60))

  const data = await loadCostData()
  const records = data.records

  if (records.length === 0) {
    console.log('\n📭 No cost records found.\n')
    console.log('Cost tracking is active. Make some AI requests to start tracking!\n')
    return
  }

  // Calculate totals
  let totalCost = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  const byProvider: Record<string, { cost: number; inputTokens: number; outputTokens: number; requests: number }> = {}
  const byModel: Record<string, { cost: number; inputTokens: number; outputTokens: number; requests: number }> = {}

  // Today's costs
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let todayCost = 0
  let todayRequests = 0

  // This month's costs
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  let monthCost = 0
  let monthRequests = 0

  for (const record of records) {
    totalCost += record.totalCost
    totalInputTokens += record.inputTokens
    totalOutputTokens += record.outputTokens

    // By provider
    if (!byProvider[record.provider]) {
      byProvider[record.provider] = { cost: 0, inputTokens: 0, outputTokens: 0, requests: 0 }
    }
    byProvider[record.provider].cost += record.totalCost
    byProvider[record.provider].inputTokens += record.inputTokens
    byProvider[record.provider].outputTokens += record.outputTokens
    byProvider[record.provider].requests++

    // By model
    if (!byModel[record.model]) {
      byModel[record.model] = { cost: 0, inputTokens: 0, outputTokens: 0, requests: 0 }
    }
    byModel[record.model].cost += record.totalCost
    byModel[record.model].inputTokens += record.inputTokens
    byModel[record.model].outputTokens += record.outputTokens
    byModel[record.model].requests++

    // Time-based
    const recordDate = new Date(record.timestamp)
    if (recordDate >= today) {
      todayCost += record.totalCost
      todayRequests++
    }
    if (recordDate >= monthStart) {
      monthCost += record.totalCost
      monthRequests++
    }
  }

  // Summary
  console.log('\n📊 SUMMARY')
  console.log('─'.repeat(60))
  console.log(`Total Requests:      ${formatNumber(records.length)}`)
  console.log(`Total Input Tokens:  ${formatNumber(totalInputTokens)}`)
  console.log(`Total Output Tokens: ${formatNumber(totalOutputTokens)}`)
  console.log(`Total Tokens:        ${formatNumber(totalInputTokens + totalOutputTokens)}`)
  console.log(`\n💰 TOTAL COST:       ${formatCurrency(totalCost)}`)

  // Time-based breakdown
  console.log('\n📅 TIME BREAKDOWN')
  console.log('─'.repeat(60))
  console.log(`Today:      ${formatCurrency(todayCost)} (${todayRequests} requests)`)
  console.log(`This Month: ${formatCurrency(monthCost)} (${monthRequests} requests)`)
  console.log(`All Time:   ${formatCurrency(totalCost)} (${records.length} requests)`)

  // By Provider
  console.log('\n🏢 BY PROVIDER')
  console.log('─'.repeat(60))
  const providersSorted = Object.entries(byProvider).sort((a, b) => b[1].cost - a[1].cost)
  for (const [provider, stats] of providersSorted) {
    const providerIcon = provider === 'groq' ? '⚡' : provider === 'gemini' ? '✨' : '🔗'
    console.log(`${providerIcon} ${provider.toUpperCase().padEnd(12)} ${formatCurrency(stats.cost).padStart(12)} │ ${formatNumber(stats.requests).padStart(6)} requests │ ${formatNumber(stats.inputTokens + stats.outputTokens).padStart(10)} tokens`)
  }

  // By Model (top 10)
  console.log('\n🤖 BY MODEL (Top 10)')
  console.log('─'.repeat(60))
  const modelsSorted = Object.entries(byModel)
    .sort((a, b) => b[1].requests - a[1].requests)
    .slice(0, 10)
  
  for (const [model, stats] of modelsSorted) {
    const shortModel = model.length > 30 ? model.substring(0, 27) + '...' : model
    console.log(`${shortModel.padEnd(32)} ${formatCurrency(stats.cost).padStart(12)} │ ${formatNumber(stats.requests).padStart(5)} reqs`)
  }

  // Free vs Paid breakdown
  const freeCost = (byProvider['groq']?.cost || 0)
  const paidCost = totalCost - freeCost
  
  console.log('\n💵 FREE vs PAID')
  console.log('─'.repeat(60))
  console.log(`Free (Groq):  ${formatCurrency(freeCost)} (${((freeCost / (totalCost || 1)) * 100).toFixed(1)}%)`)
  console.log(`Paid:         ${formatCurrency(paidCost)} (${((paidCost / (totalCost || 1)) * 100).toFixed(1)}%)`)

  // Recent activity
  console.log('\n⏱️  RECENT ACTIVITY')
  console.log('─'.repeat(60))
  console.log(`Last updated: ${getTimeAgo(data.lastUpdated)}`)
  
  if (records.length > 0) {
    const lastRecord = records[records.length - 1]
    console.log(`Last request: ${lastRecord.model} (${getTimeAgo(lastRecord.timestamp)})`)
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`📁 Data file: ${COST_FILE_PATH}`)
  console.log('')
}

main().catch(console.error)
