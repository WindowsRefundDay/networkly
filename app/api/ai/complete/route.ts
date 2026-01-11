/**
 * AI Completion API Route - Generic completion endpoint with use case support
 */

import { NextRequest, NextResponse } from "next/server"
import { getAIManager, type Message, type UseCase } from "@/lib/ai"

export const maxDuration = 60

interface CompletionRequest {
  messages: Message[]
  model?: string
  useCase?: UseCase
  temperature?: number
  maxTokens?: number
  stream?: boolean
  responseFormat?: { type: 'text' | 'json_object' }
  systemPrompt?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CompletionRequest

    // Validate input
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const ai = getAIManager()

    // Prepare messages
    const messages: Message[] = body.systemPrompt
      ? [{ role: 'system', content: body.systemPrompt }, ...body.messages]
      : body.messages

    // Streaming response
    if (body.stream) {
      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()

      ;(async () => {
        try {
          for await (const chunk of ai.stream({
            messages,
            model: body.model,
            useCase: body.useCase,
            temperature: body.temperature,
            maxTokens: body.maxTokens,
            responseFormat: body.responseFormat,
          })) {
            const data = JSON.stringify({
              id: chunk.id,
              content: chunk.content,
              isFirst: chunk.isFirst,
              isLast: chunk.isLast,
              finishReason: chunk.finishReason,
            })
            await writer.write(encoder.encode(`data: ${data}\n\n`))
          }
          await writer.write(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Stream error'
          await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
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
      messages,
      model: body.model,
      useCase: body.useCase,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      responseFormat: body.responseFormat,
    })

    return NextResponse.json({
      id: result.id,
      provider: result.provider,
      model: result.model,
      content: result.content,
      finishReason: result.finishReason,
      usage: result.usage,
      latencyMs: result.latencyMs,
    })
  } catch (error) {
    console.error('[AI Completion Error]', error)

    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = error instanceof Error && 'statusCode' in error
      ? (error as { statusCode: number }).statusCode
      : 500

    return NextResponse.json({ error: message }, { status })
  }
}
