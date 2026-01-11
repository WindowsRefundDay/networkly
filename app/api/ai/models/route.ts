/**
 * AI Models API Route - List available models and provider info
 */

import { NextRequest, NextResponse } from "next/server"
import { getAIManager, type ProviderName } from "@/lib/ai"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider') as ProviderName | null
    const tier = searchParams.get('tier') as 'free' | 'standard' | 'premium' | null
    const capability = searchParams.get('capability')

    const ai = getAIManager()
    let models = provider 
      ? ai.getProviderModels(provider)
      : ai.getAllModels()

    // Filter by tier
    if (tier) {
      models = models.filter(m => m.tier === tier)
    }

    // Filter by capability
    if (capability) {
      models = models.filter(m => m.capabilities.includes(capability as never))
    }

    // Group by provider
    const groupedModels = models.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = []
      }
      acc[model.provider].push({
        id: model.id,
        name: model.name,
        contextLength: model.contextLength,
        maxOutputTokens: model.maxOutputTokens,
        capabilities: model.capabilities,
        tier: model.tier,
        supportsStreaming: model.supportsStreaming,
        supportsVision: model.supportsVision,
        supportsFunctionCalling: model.supportsFunctionCalling,
        cost: model.costPer1kInputTokens !== undefined ? {
          inputPer1k: model.costPer1kInputTokens,
          outputPer1k: model.costPer1kOutputTokens,
        } : undefined,
      })
      return acc
    }, {} as Record<string, unknown[]>)

    return NextResponse.json({
      providers: Object.keys(groupedModels),
      totalModels: models.length,
      models: groupedModels,
    })
  } catch (error) {
    console.error('[AI Models API Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
