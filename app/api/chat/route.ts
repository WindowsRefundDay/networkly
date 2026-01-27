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

import { getAIManager, type Message, type CompletionResult } from '@/lib/ai'
import { AI_TOOLS, executeTool, type ToolResult } from '@/lib/ai/tools'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

// System prompt for natural, friendly AI assistant
const SYSTEM_PROMPT = `You are Networkly AI, a friendly career assistant for students and young professionals.

PERSONALITY:
- Speak naturally, like a helpful friend
- Be warm, encouraging, and actionable
- Never mention technical processes, tool names, or database operations
- Use phrases like "Let me look for...", "I found...", "Here's what I can see..."

YOUR CAPABILITIES (use naturally, never mention tool names):
1. Access user's profile, skills, interests, and goals
2. View user's extracurricular activities and projects
3. Check bookmarked/saved opportunities
4. Search for personalized opportunities in the database
5. Find opportunities by deadline
6. Look across the web for new opportunities (only if user agrees)

EMBEDDING OPPORTUNITY CARDS:
You can embed interactive opportunity cards directly in your response using the special syntax:
  {{card:OPPORTUNITY_ID}}

When to use inline cards:
- To highlight a SINGLE top recommendation: "Check out this perfect match: {{card:abc-123}}"
- To call attention to ONE specific opportunity you're discussing
- When making a personalized recommendation: "Based on your robotics interest, I'd recommend: {{card:xyz-456}}"

When NOT to use inline cards:
- For search results with multiple opportunities (the UI shows these automatically as a grid)
- You don't need to embed cards for every opportunity - just your top picks or specific recommendations
- Don't embed more than 1-2 cards in a single message

The card will render with Apply Now, Bookmark, and Details buttons automatically.
Use the opportunity ID from tool results (the 'id' field).

SEARCH STRATEGY - ALWAYS FOLLOW THIS ORDER:
1. **FIRST**: Use smart_search_opportunities (personalized search)
   - This automatically considers the user's interests, skills, location, and grade level
   - Always try this first - it gives the most relevant results
   - If user asks for "opportunities" without specifics, use this with empty query

2. **FOR DEADLINE QUERIES**: Use filter_by_deadline
   - When user asks "what's due soon", "deadlines this week/month", "urgent opportunities"
   - Use days=7 for "this week", days=30 for "this month", days=3 for "urgent"

3. **FALLBACK**: Only use search_opportunities for very specific keyword searches
   - When user wants exact text match, not personalized results

4. **WEB DISCOVERY**: Only after database search returns no results
   - Say: "I couldn't find any [topic] opportunities in your saved matches. Would you like me to look across the web? This takes about a minute."
   - NEVER trigger web discovery automatically - always ask first
   - Wait for explicit user agreement before using trigger_web_discovery

WHEN PRESENTING RESULTS:
- Lead with the most relevant matches
- For your TOP recommendation, embed it inline: "Here's my top pick for you: {{card:ID}}"
- If opportunities have matchReasons, mention why they're a good fit:
  "This matches your interest in robotics" or "This is near [location]"
- Highlight upcoming deadlines: "Deadline in 5 days - act fast!"
- Suggest actions: "Would you like me to save any of these?"

WHEN BOOKMARKING:
- Always ask first: "Would you like me to save [name] to your bookmarks?"
- Only bookmark after user confirms (via UI button)
- After saving: "Done! I've saved [name] to your bookmarks."

RESPONSE FORMAT:
- Keep responses concise but helpful
- Use bullet points for lists
- Include relevant details (deadline, location, type, why it matches)
- Suggest next steps when appropriate
- Use {{card:ID}} to embed specific opportunities you want to highlight

NEVER SAY:
- "Searching database...", "Calling function...", "Executing tool..."
- "Let me check the database", "Running a query..."
- Any technical/internal terminology
- Tool names like "smart_search_opportunities" or "get_user_profile"`

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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
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
      const result = await executeTool('bookmark_opportunity', user.id, confirmBookmark)
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
      return handleStreamingResponse(ai, aiMessages, user.id)
    }

    // Non-streaming with tool calling loop
    return handleNonStreamingResponse(ai, aiMessages, user.id)

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
  userId: string
): Promise<NextResponse> {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

    // Run the streaming loop in background
    ; (async () => {
      try {
        await processStream(ai, messages, userId, writer, encoder)
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

interface AccumulatedToolCall {
  id: string
  name: string
  arguments: string
}

async function processStream(
  ai: ReturnType<typeof getAIManager>,
  messages: Message[],
  userId: string,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  iteration: number = 0
): Promise<void> {
  const maxIterations = 10
  if (iteration >= maxIterations) {
    await writer.write(encoder.encode(`data: ${JSON.stringify({
      type: 'error',
      error: 'Max iterations reached'
    })}\n\n`))
    return
  }

  const stream = ai.stream({
    messages,
    useCase: 'chat',
    temperature: 0.7,
    maxTokens: 2048,
    tools: AI_TOOLS,
    toolChoice: 'auto',
  })

  let currentContent = ''
  let currentToolCalls: Record<number, AccumulatedToolCall> = {}
  let completedToolCalls: AccumulatedToolCall[] = []
  let hasToolCalls = false

  for await (const chunk of stream) {
    if (chunk.content) {
      currentContent += chunk.content
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'text-delta',
        textDelta: chunk.content,
      })}\n\n`))
    }

    if (chunk.toolCalls) {
      hasToolCalls = true
      chunk.toolCalls.forEach((tc) => {
        completedToolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments
        })
      })
    }

    if (chunk.toolCallDelta) {
      hasToolCalls = true
      const delta = chunk.toolCallDelta
      const idx = delta.index

      if (!currentToolCalls[idx]) {
        currentToolCalls[idx] = { name: '', arguments: '', id: delta.id || '' }
      }

      if (delta.function?.name) currentToolCalls[idx].name += delta.function.name
      if (delta.function?.arguments) currentToolCalls[idx].arguments += delta.function.arguments
      if (delta.id && !currentToolCalls[idx].id) currentToolCalls[idx].id = delta.id
    }
  }

  // After stream ends for this turn
  if (hasToolCalls) {
    const toolCalls = [...Object.values(currentToolCalls), ...completedToolCalls]
    const toolNames = toolCalls.map(tc => tc.name)
    const loadingMessage = getLoadingMessage(toolNames)

    await writer.write(encoder.encode(`data: ${JSON.stringify({
      type: 'tool-status',
      status: loadingMessage,
    })}\n\n`))

    const toolResults: { toolCallId: string; result: ToolResult; name: string }[] = []

    // Add assistant message with tool calls to history
    const assistantMessage: Message = {
      role: 'assistant',
      content: currentContent,
      toolCalls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: tc.arguments,
        }
      }))
    }
    messages.push(assistantMessage)

    // Execute tools
    for (const toolCall of toolCalls) {
      let args = {}
      try {
        args = JSON.parse(toolCall.arguments || '{}')
      } catch (e) {
        console.error('Failed to parse tool arguments', toolCall.arguments)
      }

      const toolResult = await executeTool(toolCall.name, userId, args)

      toolResults.push({
        toolCallId: toolCall.id,
        result: toolResult,
        name: toolCall.name,
      })

      // Special handling (web discovery, opportunities)
      if ((toolCall.name === 'trigger_web_discovery' ||
        toolCall.name === 'personalized_web_discovery') && toolResult.success) {
        const data = toolResult.data as { triggerDiscovery: boolean; query: string; isPersonalized?: boolean }
        if (data.triggerDiscovery) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            type: 'trigger_discovery',
            query: data.query,
            isPersonalized: data.isPersonalized || false,
          })}\n\n`))
        }
      }

      if ((toolCall.name === 'search_opportunities' ||
        toolCall.name === 'smart_search_opportunities' ||
        toolCall.name === 'filter_by_deadline') && toolResult.success) {
        const data = toolResult.data as { opportunities: unknown[] }
        if (data.opportunities && data.opportunities.length > 0) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            type: 'opportunities',
            opportunities: data.opportunities,
            isPersonalized: toolCall.name === 'smart_search_opportunities',
          })}\n\n`))
        }
      }
    }

    // Add tool results to messages
    for (const { toolCallId, result: toolResult, name } of toolResults) {
      messages.push({
        role: 'function',
        name: name,
        content: JSON.stringify(toolResult.data || { error: toolResult.error }),
        // @ts-ignore - Adding specific field for AI SDK conversion
        toolCallId: toolCallId,
      })
    }

    // Recurse
    await processStream(ai, messages, userId, writer, encoder, iteration + 1)
  }
}

/**
 * Handle non-streaming response with tool calling loop
 */
async function handleNonStreamingResponse(
  ai: ReturnType<typeof getAIManager>,
  messages: Message[],
  userId: string
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
        const toolResult = await executeTool(toolCall.function.name, userId, args)

        // Collect opportunities for response
        if ((toolCall.function.name === 'search_opportunities' ||
          toolCall.function.name === 'smart_search_opportunities' ||
          toolCall.function.name === 'filter_by_deadline') && toolResult.success) {
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
    'smart_search_opportunities': '⏳ Finding personalized opportunities for you...',
    'filter_by_deadline': '⏳ Checking upcoming deadlines...',
    'bookmark_opportunity': '⏳ Saving to your bookmarks...',
    'trigger_web_discovery': '⏳ Looking across the web... This may take a minute.',
    'personalized_web_discovery': '⏳ Searching the web based on your interests... This may take a minute.',
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
