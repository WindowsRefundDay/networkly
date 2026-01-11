/**
 * AI Health Check API Route
 */

import { NextResponse } from "next/server"
import { getAIManager } from "@/lib/ai"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const ai = getAIManager()
    const results = await ai.runHealthChecks()
    const statuses = ai.getProviderStatuses()

    const healthy = results.some(r => r.healthy)
    const degraded = results.some(r => r.healthy) && results.some(r => !r.healthy)

    return NextResponse.json({
      status: healthy ? (degraded ? 'degraded' : 'healthy') : 'unhealthy',
      timestamp: new Date().toISOString(),
      providers: statuses.map(s => ({
        name: s.name,
        healthy: s.healthy,
        consecutiveFailures: s.consecutiveFailures,
        averageLatencyMs: Math.round(s.averageLatencyMs),
        modelsHealthy: s.modelsHealthy,
        modelsUnhealthy: s.modelsUnhealthy,
        lastCheck: s.lastCheck.toISOString(),
      })),
      checks: results.map(r => ({
        provider: r.provider,
        model: r.model,
        healthy: r.healthy,
        latencyMs: r.latencyMs,
        error: r.error,
        timestamp: r.timestamp.toISOString(),
      })),
    }, { 
      status: healthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    })
  } catch (error) {
    console.error('[AI Health Check Error]', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
