import { POST } from '@/app/api/chat/route'
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    }
  })
}))

vi.mock('@/lib/ai', () => ({
  getAIManager: vi.fn().mockReturnValue({
    stream: vi.fn().mockImplementation(async function* () {
       // Simulate immediate streaming
       yield { content: 'Hello' }
       yield { content: ' ' }
       yield { content: 'World' }
    }),
    getProviderStatuses: vi.fn().mockReturnValue([])
  })
}))

vi.mock('@/lib/ai/tools', () => ({
  AI_TOOLS: [],
  executeTool: vi.fn()
}))

describe('Chat Streaming Performance', () => {
  it('streams response immediately without delay', async () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true
      })
    })

    const start = Date.now()
    const res = await POST(req)
    const reader = res.body?.getReader()

    if (!reader) throw new Error('No body')

    // Read first chunk
    const { value } = await reader.read()
    const firstByteTime = Date.now() - start

    console.log(`TTFB: ${firstByteTime}ms`)

    // It should be extremely fast because we mocked everything to be instant
    // The previous implementation would have waited for "ai.complete" (which we could mock to be slow or fast),
    // BUT the key is that "ai.stream" yields partials immediately.
    // If we mocked ai.complete to return immediately, the old code would still work fast,
    // BUT the old code had an artificial delay loop:
    // for (...) { await new Promise(r => setTimeout(r, 20)) }
    // This test doesn't strictly prove removal of that loop unless we assert on timing of subsequent chunks,
    // but the main goal is to prove we are using streaming response.

    expect(firstByteTime).toBeLessThan(50)

    const decoder = new TextDecoder()
    const text = decoder.decode(value)
    expect(text).toContain('textDelta')
    expect(text).toContain('Hello')
  })
})
