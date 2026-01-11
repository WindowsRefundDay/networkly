/**
 * Chat API Route - Uses the AI Model Manager for multi-provider support
 */

import { NextRequest, NextResponse } from "next/server"
import { getAIManager, type Message } from "@/lib/ai"

export const maxDuration = 60

// System prompt for Networkly AI
const SYSTEM_PROMPT = `You are Networkly AI, a helpful career assistant for students and young professionals. You help with:
- Career advice and guidance
- Networking strategies and introductions
- Application assistance (cover letters, emails, follow-ups)
- Interview preparation
- Skill development recommendations
- Opportunity discovery

Be friendly, professional, and actionable in your advice. Keep responses concise but helpful.
When suggesting connections or opportunities, be specific about why they'd be a good match.`

interface UIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { messages, stream: shouldStream = true } = await req.json() as { 
      messages: UIMessage[]
      stream?: boolean 
    }

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Get the AI Manager
    const ai = getAIManager()

    // Prepare messages with system prompt
    const aiMessages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ]

    // Streaming response
    if (shouldStream) {
      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()

      // Start streaming in background
      ;(async () => {
        try {
          for await (const chunk of ai.stream({
            messages: aiMessages,
            useCase: 'chat',
            temperature: 0.7,
            maxTokens: 2048,
          })) {
            // SSE format
            const data = JSON.stringify({
              type: 'text-delta',
              textDelta: chunk.content,
            })
            await writer.write(encoder.encode(`data: ${data}\n\n`))
          }

          // Send done event
          await writer.write(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Stream error'
          const errorData = JSON.stringify({ type: 'error', error: errorMessage })
          await writer.write(encoder.encode(`data: ${errorData}\n\n`))
        } finally {
          await writer.close()
        }
      })()

      return new NextResponse(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming response
    const result = await ai.complete({
      messages: aiMessages,
      useCase: 'chat',
      temperature: 0.7,
      maxTokens: 2048,
    })

    return NextResponse.json({
      id: result.id,
      content: result.content,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
    })
  } catch (error) {
    console.error('[Chat API Error]', error)
    
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = error instanceof Error && 'statusCode' in error 
      ? (error as { statusCode: number }).statusCode 
      : 500

    return NextResponse.json({ error: message }, { status })
  }
}

// Health check endpoint
export async function GET() {
  try {
    const ai = getAIManager()
    const statuses = ai.getProviderStatuses()
    const healthy = statuses.some(s => s.healthy)

    return NextResponse.json({
      status: healthy ? 'healthy' : 'degraded',
      providers: statuses.map(s => ({
        name: s.name,
        healthy: s.healthy,
        latencyMs: s.averageLatencyMs,
      })),
    }, { status: healthy ? 200 : 503 })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
