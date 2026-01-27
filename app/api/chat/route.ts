import { NextRequest, NextResponse } from 'next/server'
import { googleAI, type Message } from '@/lib/ai/google-model-manager'
import { TOOLS, type ToolResult } from '@/lib/ai/tools'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const SYSTEM_PROMPT = `You are Networkly AI, a friendly career assistant for students and young professionals.

PERSONALITY:
- Speak naturally, like a helpful friend
- Be warm, encouraging, and actionable
- Never mention technical processes, tool names, or database operations
- Use phrases like "Let me look for...", "I found...", "Here's what I can see..."

YOUR CAPABILITIES:
1. Access user's profile, skills, interests, and goals
2. View user's extracurricular activities and projects
3. Check bookmarked/saved opportunities
4. Search for personalized opportunities in the database
5. Find opportunities by deadline
6. Look across the web for new opportunities (only if user agrees)

TOOL USAGE:
- Use 'smart_search_opportunities' for personalized results (preferred).
- Use 'filter_by_deadline' for deadline-specific queries.
- Use 'personalized_web_discovery' only after database searches fail and user agrees.

EMBEDDING CARDS:
- Use {{card:OPPORTUNITY_ID}} to embed interactive cards for top recommendations.

RESPONSE FORMAT:
- Concise, bullet points, friendly tone.
`

interface UIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  name?: string
}

interface ChatRequest {
  messages: UIMessage[]
  stream?: boolean
  confirmBookmark?: { opportunityId: string; opportunityTitle: string }
  confirmWebDiscovery?: { query: string }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as ChatRequest
    const { messages, stream: shouldStream = true, confirmBookmark, confirmWebDiscovery } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    if (confirmBookmark) {
      const bookmarkTool = TOOLS.bookmark_opportunity
      if (!bookmarkTool.execute) {
        return NextResponse.json({ type: 'bookmark_result', success: false, message: 'Bookmark not available' })
      }
      const bookmarkResult = await bookmarkTool.execute(
        { opportunityId: confirmBookmark.opportunityId, opportunityTitle: confirmBookmark.opportunityTitle },
        { experimental_context: { userId: user.id } } as never
      )
      const typedResult = bookmarkResult as ToolResult
      return NextResponse.json({
        type: 'bookmark_result',
        success: typedResult.success,
        message: typedResult.success ? `Saved "${confirmBookmark.opportunityTitle}"!` : 'Failed to save.'
      })
    }

    if (confirmWebDiscovery) {
      return NextResponse.json({ type: 'trigger_discovery', query: confirmWebDiscovery.query })
    }

    const aiMessages = createMessages(messages)

    if (shouldStream) {
      return handleStreaming(aiMessages, user.id, supabase)
    }

    return NextResponse.json({ error: 'Standard mode not implemented' })

  } catch (error) {
    console.error('[Chat API Error]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function createMessages(uiMessages: UIMessage[]): Message[] {
  return uiMessages.map(msg => ({
    role: msg.role,
    content: msg.content,
    toolCallId: msg.toolCallId,
    name: msg.name,
  }))
}

async function handleStreaming(messages: Message[], userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  ;(async () => {
    try {
      await processStreamLoop(messages, userId, supabase, writer, encoder)
      await writer.write(encoder.encode('data: [DONE]\n\n'))
    } catch (e) {
      console.error('Stream processing error:', e)
      const err = e instanceof Error ? e.message : String(e)
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: err })}\n\n`))
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

async function processStreamLoop(
  messages: Message[],
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  recursionDepth = 0
) {
  if (recursionDepth > 5) throw new Error('Max recursion depth reached')

  const result = await googleAI.stream({
    messages,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    experimental_context: { userId, supabaseClient: supabase },
  })

  let fullContent = ''
  const toolCalls: Array<{ toolCallId: string; toolName: string; args: unknown }> = []
  const toolResults: Array<{ toolCallId: string; toolName: string; output: unknown }> = []

  for await (const chunk of result.fullStream) {
    if (chunk.type === 'text-delta') {
      const text = chunk.text || ''
      fullContent += text
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'text-delta',
        textDelta: text
      })}\n\n`))
    }
    
    if (chunk.type === 'tool-call') {
      const input = 'input' in chunk ? chunk.input : ('args' in chunk ? (chunk as unknown as { args: unknown }).args : {})
      toolCalls.push({
        toolCallId: chunk.toolCallId,
        toolName: chunk.toolName,
        args: input,
      })
      
      const statusMsg = getLoadingMessage([chunk.toolName])
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'tool-status',
        status: statusMsg
      })}\n\n`))
    }
    
    if (chunk.type === 'tool-result') {
      toolResults.push({
        toolCallId: chunk.toolCallId,
        toolName: chunk.toolName,
        output: chunk.output,
      })
      
      await handleSpecialToolTriggers(chunk.toolName, chunk.output, writer, encoder)
    }
  }

  if (toolCalls.length > 0) {
    messages.push({
      role: 'assistant',
      content: fullContent || '',
      toolCalls: toolCalls.map(tc => ({
        id: tc.toolCallId,
        function: {
          name: tc.toolName,
          arguments: JSON.stringify(tc.args)
        }
      }))
    })

    for (const tr of toolResults) {
      messages.push({
        role: 'tool',
        content: JSON.stringify(tr.output),
        toolCallId: tr.toolCallId,
        name: tr.toolName,
      })
    }

    await processStreamLoop(messages, userId, supabase, writer, encoder, recursionDepth + 1)
  }
}

async function handleSpecialToolTriggers(
  toolName: string, 
  output: unknown, 
  writer: WritableStreamDefaultWriter, 
  encoder: TextEncoder
) {
  const result = output as ToolResult
  if (!result?.success || !result?.data) return
  
  const data = result.data as Record<string, unknown>

  if (toolName.includes('web_discovery') && data.triggerDiscovery) {
    await writer.write(encoder.encode(`data: ${JSON.stringify({
      type: 'trigger_discovery',
      query: data.query,
      isPersonalized: data.isPersonalized || false,
    })}\n\n`))
  }

  if (toolName.includes('search_opportunities') || toolName === 'filter_by_deadline') {
    const opportunities = data.opportunities as unknown[] | undefined
    if (opportunities && opportunities.length > 0) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'opportunities',
        opportunities: opportunities,
        isPersonalized: toolName === 'smart_search_opportunities',
      })}\n\n`))
    }
  }
}

function getLoadingMessage(toolNames: string[]): string {
  const messages: Record<string, string> = {
    'get_user_profile': 'Looking at your profile...',
    'get_extracurriculars': 'Checking your activities...',
    'get_saved_opportunities': 'Looking at your bookmarks...',
    'search_opportunities': 'Looking for opportunities...',
    'smart_search_opportunities': 'Finding personalized opportunities for you...',
    'filter_by_deadline': 'Checking upcoming deadlines...',
    'trigger_web_discovery': 'Looking across the web...',
    'personalized_web_discovery': 'Searching the web based on your interests...',
  }
  for (const name of toolNames) {
    if (messages[name]) return messages[name]
  }
  return 'Thinking...'
}
