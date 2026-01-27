'use client'

/**
 * ChatInterface - Agentic AI chat with tool calling support
 * 
 * Features:
 * - Streams AI responses with tool calling
 * - Renders opportunity cards inline (via {{card:id}} syntax)
 * - Handles bookmark/discovery confirmations
 * - Integrates web discovery with live progress
 * - Save/load chat session
 */

import type React from 'react'
import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sparkles, Send, User, Save, RotateCcw, History, X } from 'lucide-react'
import { useSupabaseUser } from '@/hooks/use-supabase-user'

import { OpportunityGrid, type InlineOpportunity } from './opportunity-card-inline'
import { SimpleLoading, DiscoveryLoading, TypingIndicator } from './simple-loading'
import { WebDiscoveryConfirm } from './action-buttons'
import { MarkdownMessage } from './markdown-message'
import { saveChatSession, getSavedChatSession, type ChatSession } from '@/app/actions/chat'
import { useInlineDiscovery } from '@/hooks/use-inline-discovery'

// Message types
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  opportunities?: InlineOpportunity[]
  // Cache of opportunities by ID for inline card rendering
  opportunityCache?: Record<string, InlineOpportunity>
  isStreaming?: boolean
  toolStatus?: string
  // For discovery prompt
  discoveryPrompt?: { query: string }
}

interface StreamEvent {
  type: 'text-delta' | 'tool-status' | 'opportunities' | 'trigger_discovery' | 'error'
  textDelta?: string
  status?: string
  opportunities?: InlineOpportunity[]
  query?: string
  error?: string
}

export interface ChatInterfaceRef {
  sendMessage: (text: string) => void
  loadSession: (session: ChatSession) => void
}

const quickPrompts = [
  'Find me STEM internships for this summer',
  'What opportunities match my skills?',
  'Help me prepare for my interview',
  'Draft a networking message',
  'What skills should I learn next?',
  'Show me my saved opportunities',
]

export const ChatInterface = forwardRef<ChatInterfaceRef>((props, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const [pendingDiscoveryQuery, setPendingDiscoveryQuery] = useState<string | null>(null)
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [hasSavedSession, setHasSavedSession] = useState(false)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { user } = useSupabaseUser()

  const userName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    'User'
  const userAvatar = (user?.user_metadata?.avatar_url as string | undefined) || '/placeholder.svg'

  // Build a global opportunity cache from all messages
  const globalOpportunityCache = useMemo(() => {
    const cache: Record<string, InlineOpportunity> = {}
    for (const message of messages) {
      // Add from message's opportunities array
      if (message.opportunities) {
        for (const opp of message.opportunities) {
          cache[opp.id] = opp
        }
      }
      // Add from message's opportunityCache
      if (message.opportunityCache) {
        Object.assign(cache, message.opportunityCache)
      }
    }
    return cache
  }, [messages])

  const [currentDiscoveryId, setCurrentDiscoveryId] = useState<string | null>(null)

  // Inline discovery hook
  const { progress: discoveryProgress, isActive: isDiscovering, startDiscovery, stopDiscovery } = useInlineDiscovery({
    onOpportunityFound: (opportunity) => {
      // Update discovery message with new opportunity
      setMessages(prev => {
        if (!currentDiscoveryId) return prev
        const discoveryMsgIndex = prev.findIndex(m => m.id === currentDiscoveryId)
        if (discoveryMsgIndex >= 0) {
          const msg = prev[discoveryMsgIndex]
          const newOpps = [...(msg.opportunities || []), opportunity]
          // Also update cache
          const newCache = { ...(msg.opportunityCache || {}), [opportunity.id]: opportunity }
          return [
            ...prev.slice(0, discoveryMsgIndex),
            { ...msg, opportunities: newOpps, opportunityCache: newCache },
            ...prev.slice(discoveryMsgIndex + 1),
          ]
        }
        return prev
      })
    },
    onComplete: (opportunities) => {
      setPendingDiscoveryQuery(null)

      // Update or add final discovery message
      setMessages(prev => {
        if (!currentDiscoveryId) return prev
        const discoveryMsgIndex = prev.findIndex(m => m.id === currentDiscoveryId)
        const content = opportunities.length > 0
          ? `Great news! I found ${opportunities.length} opportunities for you:`
          : "I searched the web but couldn't find any new opportunities matching your criteria. Try a different search term?"

        // Build cache from opportunities
        const cache: Record<string, InlineOpportunity> = {}
        for (const opp of opportunities) {
          cache[opp.id] = opp
        }

        if (discoveryMsgIndex >= 0) {
          return [
            ...prev.slice(0, discoveryMsgIndex),
            { ...prev[discoveryMsgIndex], content, opportunities, opportunityCache: cache, isStreaming: false },
            ...prev.slice(discoveryMsgIndex + 1),
          ]
        }

        return [...prev, {
          id: currentDiscoveryId,
          role: 'assistant' as const,
          content,
          opportunities,
          opportunityCache: cache,
        }]
      })
      setCurrentDiscoveryId(null)
    },
    onError: (error) => {
      setPendingDiscoveryQuery(null)
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `Sorry, I encountered an issue while searching: ${error}. Please try again.`,
      }])
    },
  })

  // Check for saved session on mount
  useEffect(() => {
    getSavedChatSession().then((session) => {
      if (session) {
        setHasSavedSession(true)
      }
    })
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages, toolStatus, discoveryProgress])

  // Generate unique message ID
  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  const getEmbeddedCardIds = (content: string): string[] => {
    const cardPattern = /\{\{card:([a-zA-Z0-9-_]+)\}\}/g
    const ids: string[] = []
    let match
    while ((match = cardPattern.exec(content)) !== null) {
      ids.push(match[1])
    }
    return ids
  }

  const filterOpportunitiesForGrid = (opportunities: InlineOpportunity[], content: string): InlineOpportunity[] => {
    const embeddedIds = getEmbeddedCardIds(content)
    const embeddedIdSet = new Set(embeddedIds)
    return opportunities.filter(opp => !embeddedIdSet.has(opp.id))
  }

  // Send message to API
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setToolStatus(null)

    // Create assistant placeholder for streaming
    const assistantId = generateId()
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }])

    try {
      // Prepare messages for API
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }))

      abortControllerRef.current = new AbortController()

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, stream: true }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let accumulatedOpportunities: InlineOpportunity[] = []
      let opportunityCache: Record<string, InlineOpportunity> = {}

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const event: StreamEvent = JSON.parse(data)

              switch (event.type) {
                case 'text-delta':
                  accumulatedContent += event.textDelta || ''
                  setMessages(prev => prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: accumulatedContent, opportunityCache }
                      : m
                  ))
                  setToolStatus(null)
                  break

                case 'tool-status':
                  setToolStatus(event.status || null)
                  break

                case 'opportunities':
                  if (event.opportunities) {
                    // Deduplicate by id, keeping newest occurrence
                    const allOpps = [...accumulatedOpportunities, ...event.opportunities]
                    const uniqueMap = new Map(allOpps.map(opp => [opp.id, opp]))
                    accumulatedOpportunities = Array.from(uniqueMap.values())
                    // Build cache from opportunities
                    for (const opp of event.opportunities) {
                      opportunityCache[opp.id] = opp
                    }
                    setMessages(prev => prev.map(m =>
                      m.id === assistantId
                        ? { ...m, opportunities: accumulatedOpportunities, opportunityCache }
                        : m
                    ))
                  }
                  break

                case 'trigger_discovery':
                  // Set pending discovery query - will show confirmation UI
                  if (event.query) {
                    setPendingDiscoveryQuery(event.query)
                  }
                  break

                case 'error':
                  console.error('[Chat Error]', event.error)
                  accumulatedContent += '\n\nSorry, something went wrong. Please try again.'
                  setMessages(prev => prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: accumulatedContent, isStreaming: false }
                      : m
                  ))
                  break
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Finalize the message
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, isStreaming: false, opportunityCache }
          : m
      ))

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('[Chat Error]', error)
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
            : m
        ))
      }
    } finally {
      setIsLoading(false)
      setToolStatus(null)
      abortControllerRef.current = null
    }
  }, [messages, isLoading])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    sendMessage: (text: string) => {
      sendMessage(text)
    },
    loadSession: (session: ChatSession) => {
      if (session && session.messages.length > 0) {
        setMessages(session.messages.map((m, i) => {
          // Build cache from opportunities
          const cache: Record<string, InlineOpportunity> = {}
          if (m.opportunities) {
            for (const opp of m.opportunities as InlineOpportunity[]) {
              cache[opp.id] = opp
            }
          }
          return {
            id: `loaded-${i}`,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            opportunities: m.opportunities as InlineOpportunity[] | undefined,
            opportunityCache: Object.keys(cache).length > 0 ? cache : undefined,
          }
        }))
        setHasSavedSession(true)
      }
    }
  }))

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  // Handle quick prompt
  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  // Handle bookmark
  const handleBookmark = async (opportunityId: string, opportunityTitle: string) => {
    // Don't bookmark if already bookmarked
    if (bookmarkedIds.has(opportunityId)) return

    setBookmarkingId(opportunityId)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          confirmBookmark: { opportunityId, opportunityTitle },
        }),
      })
      const result = await response.json()

      if (result.success) {
        // Add to bookmarked set
        setBookmarkedIds(prev => new Set([...prev, opportunityId]))
        
        // Add confirmation message
        setMessages(prev => [...prev, {
          id: generateId(),
          role: 'assistant',
          content: result.message,
        }])
      }
    } catch (error) {
      console.error('[Bookmark Error]', error)
    } finally {
      setBookmarkingId(null)
    }
  }

  // Handle web discovery confirmation
  const handleConfirmDiscovery = () => {
    if (!pendingDiscoveryQuery) return

    const discoveryId = generateId()
    setCurrentDiscoveryId(discoveryId)

    // Add placeholder for discovery results
    setMessages(prev => [...prev, {
      id: discoveryId,
      role: 'assistant',
      content: '',
      opportunities: [],
      isStreaming: true,
    }])

    // Start discovery
    startDiscovery(pendingDiscoveryQuery)
  }

  // Handle cancel discovery prompt
  const handleCancelDiscovery = () => {
    setPendingDiscoveryQuery(null)
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'assistant',
      content: "No problem! Let me know if you'd like to search for something else.",
    }])
  }

  // Handle stop active discovery
  const handleStopDiscovery = () => {
    stopDiscovery()
  }

  // Save chat session
  const handleSaveChat = async () => {
    if (messages.length === 0) return

    const result = await saveChatSession(
      messages.map(m => ({
        role: m.role,
        content: m.content,
        opportunities: m.opportunities,
      }))
    )

    if (result.success) {
      setHasSavedSession(true)
    }
  }

  // Load saved session
  const handleLoadChat = async () => {
    const session = await getSavedChatSession()
    if (session && session.messages.length > 0) {
      setMessages(session.messages.map((m, i) => {
        // Build cache from opportunities
        const cache: Record<string, InlineOpportunity> = {}
        if (m.opportunities) {
          for (const opp of m.opportunities as InlineOpportunity[]) {
            cache[opp.id] = opp
          }
        }
        return {
          id: `loaded-${i}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          opportunities: m.opportunities as InlineOpportunity[] | undefined,
          opportunityCache: Object.keys(cache).length > 0 ? cache : undefined,
        }
      }))
    }
  }

  // Clear chat
  const handleNewChat = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    stopDiscovery()
    setMessages([])
    setInput('')
    setIsLoading(false)
    setToolStatus(null)
    setPendingDiscoveryQuery(null)
    setBookmarkedIds(new Set())
  }

  return (
    <div className="flex flex-col h-full bg-background rounded-2xl border border-border shadow-sm">
      <div className="flex-none border-b border-border p-6 bg-card rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Networkly AI Assistant</h2>
              <p className="text-sm text-muted-foreground">Your personal career guide</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasSavedSession && messages.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadChat}
                className="h-9 text-sm"
              >
                <History className="h-4 w-4 mr-2" />
                Load Saved
              </Button>
            )}
            {messages.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveChat}
                  className="h-9 text-sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewChat}
                  className="h-9 text-sm"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-background">
        <div className="h-full overflow-y-auto p-6" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg mb-8">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                How can I help you today?
              </h2>
              <p className="text-base text-muted-foreground text-center max-w-lg mb-10">
                I can find opportunities, help with applications, and give career advice — all personalized to your profile.
              </p>

              <div className="w-full max-w-3xl space-y-4">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center mb-6">
                  Try asking
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quickPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      className="h-auto py-4 px-5 text-left justify-start bg-background hover:bg-muted border-2 border-border/50 hover:border-primary/50 transition-all duration-200 rounded-xl"
                      onClick={() => handleQuickPrompt(prompt)}
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <span className="text-base font-medium text-foreground line-clamp-2">
                          {prompt}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
                      <Sparkles className="h-6 w-6 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`max-w-[75%]`}>
                    <div
                      className={`rounded-2xl px-5 py-4 ${message.role === 'user'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-foreground border border-border/50'
                        }`}
                    >
                      {message.content ? (
                        <MarkdownMessage 
                          content={message.content}
                          opportunityCache={globalOpportunityCache}
                          onBookmark={handleBookmark}
                          bookmarkingId={bookmarkingId || undefined}
                          bookmarkedIds={bookmarkedIds}
                        />
                      ) : message.isStreaming ? (
                        <TypingIndicator />
                      ) : null}
                    </div>

                    {message.opportunities && message.opportunities.length > 0 && (
                      <div className="mt-4">
                        <OpportunityGrid
                          opportunities={filterOpportunitiesForGrid(message.opportunities, message.content)}
                          onBookmark={handleBookmark}
                          bookmarkingId={bookmarkingId || undefined}
                          bookmarkedIds={bookmarkedIds}
                        />
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="h-10 w-10 shrink-0 shadow-sm">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {toolStatus && (
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
                    <Sparkles className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <SimpleLoading message={toolStatus} />
                </div>
              )}

              {pendingDiscoveryQuery && !isDiscovering && (
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
                    <Sparkles className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <WebDiscoveryConfirm
                    query={pendingDiscoveryQuery}
                    onConfirm={handleConfirmDiscovery}
                    onCancel={handleCancelDiscovery}
                    className="flex-1"
                  />
                </div>
              )}

              {isDiscovering && (
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
                    <Sparkles className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <DiscoveryLoading foundCount={discoveryProgress.foundCount} className="flex-1" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{discoveryProgress.message}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStopDiscovery}
                        className="h-8 text-sm"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Stop
                      </Button>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${discoveryProgress.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-none border-t border-border p-5 bg-card rounded-b-2xl">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            placeholder="Ask me anything about your career..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || isDiscovering}
            className="flex-1 h-12 text-base"
          />
          <Button type="submit" size="lg" disabled={isLoading || isDiscovering || !input.trim()} className="h-12 w-12">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  )
})
ChatInterface.displayName = 'ChatInterface'
