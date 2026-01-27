/**
 * AI Models API Route - Simplified
 */

import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    providers: ['vertex-ai'],
    totalModels: 1,
    models: {
      'vertex-ai': [{
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        tier: 'standard',
        capabilities: ['chat', 'tool-calling']
      }]
    },
  })
}
