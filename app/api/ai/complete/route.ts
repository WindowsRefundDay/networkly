/**
 * AI Completion API Route - Simplified with GoogleModelManager
 */

import { NextRequest, NextResponse } from "next/server"
import { googleAI, type Message } from "@/lib/ai"

export const maxDuration = 60

interface CompletionRequest {
  messages: Message[]
  stream?: boolean
  systemPrompt?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CompletionRequest

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const messages = body.messages
    const system = body.systemPrompt

    if (body.stream) {
      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()

        ; (async () => {
          try {
            const result = await googleAI.stream({ messages, system })

            for await (const chunk of result.fullStream) {
              if (chunk.type === 'text-delta') {
                await writer.write(encoder.encode(`data: ${JSON.stringify({
                  content: chunk.textDelta,
                  type: 'delta'
                })}\n\n`))
              }
            }
            await writer.write(encoder.encode('data: [DONE]\n\n'))
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Stream error'
            await writer.write(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
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

    // Non-streaming
    const result = await googleAI.complete({ messages, system })
    return NextResponse.json({ content: result.text })

  } catch (error) {
    console.error('[AI Completion Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
