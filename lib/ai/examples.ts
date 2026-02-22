/**
 * AI Integration - Example Usage
 * 
 * This file demonstrates how to use the simplified AI integration layer.
 */

import { googleAI, type Message } from '@/lib/ai'

/**
 * Example 1: Simple completion
 */
async function basicCompletionExample() {
  const result = await googleAI.complete({
    messages: [
      { role: 'user', content: 'What is the capital of France?' }
    ],
    system: 'You are a helpful assistant.'
  })

  console.log('Response:', result.text)
}

/**
 * Example 2: Streaming response
 */
async function streamingExample() {
  const result = await googleAI.stream({
    messages: [
      { role: 'user', content: 'Tell me a short story about a robot.' }
    ]
  })

  for await (const chunk of result.fullStream) {
    if (chunk.type === 'text-delta') {
      process.stdout.write((chunk as any).text)
    }
  }
}

/**
 * Example 3: Error handling
 */
async function errorHandlingExample() {
  try {
    await googleAI.complete({
      messages: [{ role: 'user', content: 'Hello' }]
    })
  } catch (error) {
    console.error('AI Error:', error)
  }
}
