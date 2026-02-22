/**
 * AI Health Check API Route - Simplified
 */

import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  // Simple check - if environment variables are present, we assume healthy for now
  // Real check would be making a small API call, but let's keep it lightweight
  const isHealthy = !!process.env.GOOGLE_VERTEX_PROJECT

  return NextResponse.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    provider: 'vertex-ai',
    model: 'gemini-2.5-flash'
  }, {
    status: isHealthy ? 200 : 503,
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  })
}
