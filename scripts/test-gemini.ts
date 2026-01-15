#!/usr/bin/env npx ts-node

/**
 * Test Gemini Provider
 * 
 * Quick test to verify Gemini API is working and costs are tracked.
 * 
 * Usage:
 *   npx tsx scripts/test-gemini.ts
 */

import { GeminiProvider } from '../lib/ai/providers/gemini'
import { getCostTracker } from '../lib/ai/utils/cost-tracker'

async function main() {
  console.log('\n✨ Testing Gemini Provider\n')
  console.log('═'.repeat(50))

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.error('❌ No Gemini API key found!')
    console.log('Set GEMINI_API_KEY or GOOGLE_AI_API_KEY in your .env file')
    process.exit(1)
  }

  console.log('✅ API key found')

  const provider = new GeminiProvider({ apiKey })
  console.log(`✅ Provider initialized with ${provider.getModels().length} models`)

  console.log('\n📋 Available Gemini Models:')
  for (const model of provider.getModels()) {
    console.log(`   - ${model.id}: ${model.name}`)
  }

  console.log('\n🧪 Testing completion with gemini-2.5-flash-lite-preview-06-17...\n')

  try {
    const startTime = Date.now()
    const result = await provider.complete({
      model: 'gemini-2.5-flash-lite-preview-06-17',
      messages: [
        { role: 'user', content: 'Say "Hello from Gemini 2.5!" in exactly 5 words.' }
      ],
      maxTokens: 50,
      temperature: 0.7,
    })

    const latency = Date.now() - startTime

    console.log('✅ Completion successful!')
    console.log('─'.repeat(50))
    console.log(`Response: ${result.content}`)
    console.log(`Model: ${result.model}`)
    console.log(`Tokens: ${result.usage.promptTokens} in / ${result.usage.completionTokens} out`)
    console.log(`Latency: ${latency}ms`)
    console.log('─'.repeat(50))

    // Check cost tracker
    const tracker = getCostTracker()
    const summary = tracker.getSummary()
    
    console.log('\n💰 Cost Tracking:')
    console.log(`   Gemini requests: ${summary.byProvider['gemini']?.requests || 0}`)
    console.log(`   Gemini cost: $${(summary.byProvider['gemini']?.cost || 0).toFixed(6)}`)
    console.log(`   Gemini tokens: ${(summary.byProvider['gemini']?.inputTokens || 0) + (summary.byProvider['gemini']?.outputTokens || 0)}`)

  } catch (error) {
    console.error('❌ Completion failed:', error)
    process.exit(1)
  }

  console.log('\n✅ Gemini test completed successfully!\n')
}

main().catch(console.error)
