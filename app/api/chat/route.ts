/**
 * Chat API Route - Agentic AI with Tool Calling
 * 
 * Supports:
 * - Multi-turn tool calling loop
 * - Database access for user data
 * - Web discovery trigger
 * - Natural language responses (no technical details exposed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { getAIManager, type Message, type CompletionResult } from '@/lib/ai'
import { AI_TOOLS, executeTool, type ToolResult } from '@/lib/ai/tools'

export const maxDuration = 60

// System prompt for natural, friendly AI assistant
const SYSTEM_PROMPT = `You are Networkly AI, a friendly career assistant for students and young professionals.

PERSONALITY:
- Speak naturally, like a helpful friend
- Be warm, encouraging, and actionable
- Never mention technical processes, tool names, or database operations
- Use phrases like "Let me look for...", "I found...", "Here's what I can see..."

CAPABILITIES (use naturally, don't mention tools):
- Access user's profile, skills, interests, and goals
- View user's extracurricular activities
- Check bookmarked/saved opportunities
- Search for opportunities in the database
- Look across the web for new opportunities (if user agrees)

WHEN SEARCHING FOR OPPORTUNITIES:
- First search the database silently
- If found: "I found X opportunities that might interest you:"
- If none found: "I couldn't find any [topic] opportunities in your saved matches. Would you like me to look across the web? This takes about a minute."
- Wait for user to agree before triggering web discovery

WHEN BOOKMARKING:
- Always ask first: "Would you like me to save [name] to your bookmarks?"
- Only bookmark after user confirms (via UI button)
- After saving: "Done! ✓ I've saved [name] to your bookmarks."

RESPONSE FORMAT:
- Keep responses concise but helpful
- Use bullet points for lists
- Include relevant details (deadline, location, type)
- Suggest next steps when appropriate

NEVER SAY:
- "Searching database...", "Calling function...", "Executing tool..."
- "Let me check the database", "Running a query..."
- Any technical/internal terminology
- Tool names like "search_opportunities" or "get_user_profile"`

interface UIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  name?: string
}

interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface ChatRequest {
  messages: UIMessage[]
  stream?: boolean
  // Special flags from UI
  confirmBookmark?: { opportunityId: string; opportunityTitle: string }
  confirmWebDiscovery?: { query: string }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as ChatRequest
    const { messages, stream: shouldStream = true, confirmBookmark, confirmWebDiscovery } = body

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Handle special confirmation actions from UI
    if (confirmBookmark) {
      const result = await executeTool('bookmark_opportunity', clerkId, confirmBookmark)
      return NextResponse.json({
        type: 'bookmark_result',
        success: result.success,
        message: result.success 
          ? `Done! ✓ I've saved "${confirmBookmark.opportunityTitle}" to your bookmarks.`
          : 'Sorry, I couldn\'t save that opportunity. Please try again.',
      })
    }

    if (confirmWebDiscovery) {
      // Return a flag to trigger web discovery in the client
      return NextResponse.json({
        type: 'trigger_discovery',
        query: confirmWebDiscovery.query,
      })
    }

    // Get the AI Manager
    const ai = getAIManager()

    // Prepare messages with system prompt
    const aiMessages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant' | 'function',
        content: msg.content,
        name: msg.name,
      })),
    ]

    // Streaming response with tool calling support
    if (shouldStream) {
      return handleStreamingResponse(ai, aiMessages, clerkId)
    }

    // Non-streaming with tool calling loop
    return handleNonStreamingResponse(ai, aiMessages, clerkId)

  } catch (error) {
    console.error('[Chat API Error]', error)
    
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = error instanceof Error && 'statusCode' in error 
      ? (error as { statusCode: number }).statusCode 
      : 500

    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * Handle streaming response with tool calling
 */
async function handleStreamingResponse(
  ai: ReturnType<typeof getAIManager>,
  messages: Message[],
  clerkId: string
): Promise<NextResponse> {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Run the streaming loop in background
  ;(async () => {
    try {
      let currentMessages = [...messages]
      let iterations = 0
      const maxIterations = 10 // Prevent infinite loops

      while (iterations < maxIterations) {
        iterations++

        // Make API call with tools
        const result = await ai.complete({
          messages: currentMessages,
          useCase: 'chat',
          temperature: 0.7,
          maxTokens: 2048,
          tools: AI_TOOLS,
          toolChoice: 'auto',
        }) as CompletionResult

        // Check if we have tool calls
        if (result.toolCalls && result.toolCalls.length > 0) {
          // Send tool status (simple loading indicator)
          const toolNames = result.toolCalls.map(tc => tc.function.name)
          const loadingMessage = getLoadingMessage(toolNames)
          
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            type: 'tool-status',
            status: loadingMessage,
          })}\n\n`))

          // Execute all tool calls
          const toolResults: { toolCallId: string; result: ToolResult; name: string }[] = []
          
          for (const toolCall of result.toolCalls) {
            const args = JSON.parse(toolCall.function.arguments || '{}')
            const toolResult = await executeTool(toolCall.function.name, clerkId, args)
            
            toolResults.push({
              toolCallId: toolCall.id,
              result: toolResult,
              name: toolCall.function.name,
            })

            // Special handling for web discovery trigger
            if (toolCall.function.name === 'trigger_web_discovery' && toolResult.success) {
              const data = toolResult.data as { triggerDiscovery: boolean; query: string }
              if (data.triggerDiscovery) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({
                  type: 'trigger_discovery',
                  query: data.query,
                })}\n\n`))
              }
            }

            // Send opportunity results for rendering cards
            if (toolCall.function.name === 'search_opportunities' && toolResult.success) {
              const data = toolResult.data as { opportunities: unknown[] }
              if (data.opportunities && data.opportunities.length > 0) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({
                  type: 'opportunities',
                  opportunities: data.opportunities,
                })}\n\n`))
              }
            }
          }

          // Add assistant message with tool calls to history
          currentMessages.push({
            role: 'assistant',
            content: result.content || '',
            functionCall: result.toolCalls[0] ? {
              name: result.toolCalls[0].function.name,
              arguments: result.toolCalls[0].function.arguments,
            } : undefined,
          })

          // Add tool results to messages
          for (const { toolCallId, result: toolResult, name } of toolResults) {
            currentMessages.push({
              role: 'function',
              name: name,
              content: JSON.stringify(toolResult.data || { error: toolResult.error }),
            })
          }

          // Continue the loop to get final response
          continue
        }

        // No tool calls - stream the final response
        if (result.content) {
          // Send as streaming chunks for consistent UI
          const words = result.content.split(' ')
          for (let i = 0; i < words.length; i++) {
            const chunk = (i === 0 ? '' : ' ') + words[i]
            await writer.write(encoder.encode(`data: ${JSON.stringify({
              type: 'text-delta',
              textDelta: chunk,
            })}\n\n`))
            // Small delay for natural streaming feel
            await new Promise(r => setTimeout(r, 20))
          }
        }

        break // Exit loop after final response
      }

      // Send done event
      await writer.write(encoder.encode('data: [DONE]\n\n'))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Stream error'
      console.error('[Chat Stream Error]', error)
      await writer.write(encoder.encode(`data: ${JSON.stringify({ 
        type: 'error', 
        error: errorMessage 
      })}\n\n`))
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

/**
 * Handle non-streaming response with tool calling loop
 */
async function handleNonStreamingResponse(
  ai: ReturnType<typeof getAIManager>,
  messages: Message[],
  clerkId: string
): Promise<NextResponse> {
  let currentMessages = [...messages]
  let iterations = 0
  const maxIterations = 10
  const opportunitiesFound: unknown[] = []

  while (iterations < maxIterations) {
    iterations++

    const result = await ai.complete({
      messages: currentMessages,
      useCase: 'chat',
      temperature: 0.7,
      maxTokens: 2048,
      tools: AI_TOOLS,
      toolChoice: 'auto',
    }) as CompletionResult

    // Handle tool calls
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const toolCall of result.toolCalls) {
        const args = JSON.parse(toolCall.function.arguments || '{}')
        const toolResult = await executeTool(toolCall.function.name, clerkId, args)

        // Collect opportunities for response
        if (toolCall.function.name === 'search_opportunities' && toolResult.success) {
          const data = toolResult.data as { opportunities: unknown[] }
          if (data.opportunities) {
            opportunitiesFound.push(...data.opportunities)
          }
        }

        // Add to message history
        currentMessages.push({
          role: 'assistant',
          content: result.content || '',
          functionCall: {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
          },
        })

        currentMessages.push({
          role: 'function',
          name: toolCall.function.name,
          content: JSON.stringify(toolResult.data || { error: toolResult.error }),
        })
      }
      continue
    }

    // Final response
    return NextResponse.json({
      id: result.id,
      content: result.content,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
      opportunities: opportunitiesFound.length > 0 ? opportunitiesFound : undefined,
    })
  }

  return NextResponse.json({
    error: 'Too many tool call iterations',
  }, { status: 500 })
}

/**
 * Get a friendly loading message for tool operations
 */
function getLoadingMessage(toolNames: string[]): string {
  // Map tool names to friendly messages
  const messages: Record<string, string> = {
    'get_user_profile': '⏳ Looking at your profile...',
    'get_extracurriculars': '⏳ Checking your activities...',
    'get_saved_opportunities': '⏳ Looking at your bookmarks...',
    'get_projects': '⏳ Checking your projects...',
    'get_goals': '⏳ Looking at your goals...',
    'search_opportunities': '⏳ Looking for opportunities...',
    'bookmark_opportunity': '⏳ Saving to your bookmarks...',
    'trigger_web_discovery': '⏳ Looking across the web... This may take a minute.',
  }

  // Return the first matching message, or a generic one
  for (const name of toolNames) {
    if (messages[name]) {
      return messages[name]
    }
  }
  return '⏳ Looking...'
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
