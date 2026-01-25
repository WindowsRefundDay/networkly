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

  // Inline discovery hook
  const { progress: discoveryProgress, isActive: isDiscovering, startDiscovery, stopDiscovery } = useInlineDiscovery({
    onOpportunityFound: (opportunity) => {
      // Update the discovery message with new opportunity
      setMessages(prev => {
        const discoveryMsgIndex = prev.findIndex(m => m.id === 'discovery-results')
        if (discoveryMsgIndex >= 0) {
          const msg = prev[discoveryMsgIndex]
          const newOpps = [...(msg.opportunities || []), opportunity]
          // Also update the cache
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

      // Update or add the final discovery message
      setMessages(prev => {
        const discoveryMsgIndex = prev.findIndex(m => m.id === 'discovery-results')
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
          id: 'discovery-results',
          role: 'assistant' as const,
          content,
          opportunities,
          opportunityCache: cache,
        }]
      })
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
                    accumulatedOpportunities = [...accumulatedOpportunities, ...event.opportunities]
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

    // Add placeholder for discovery results
    setMessages(prev => [...prev, {
      id: 'discovery-results',
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
    <div className="flex flex-col h-full bg-background/40 backdrop-blur-md rounded-3xl border border-border/50 shadow-2xl overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-none border-b border-border/50 p-6 bg-card/50 backdrop-blur-xl z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary shadow-md">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">Networkly AI Assistant</h2>
              <p className="text-sm text-muted-foreground truncate">Your personal career guide</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
            <div className="flex flex-col items-center justify-start md:justify-center min-h-full py-12 pt-20">
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-blue-600 shadow-xl shadow-primary/20">
                  <Sparkles className="h-12 w-12 text-primary-foreground" />
                </div>
              </div>
              
              <h2 className="text-3xl font-extrabold text-foreground mb-4 tracking-tight text-center">
                Your AI Career Partner
              </h2>
              <p className="text-lg text-muted-foreground text-center max-w-lg mb-12 leading-relaxed">
                Unlock your potential with personalized career advice, internship discovery, and application support.
              </p>

              <div className="w-full max-w-4xl px-4">
                <div className="flex items-center gap-3 mb-8 justify-center">
                  <div className="h-px w-12 bg-border/50" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                    Quick Start Suggestions
                  </p>
                  <div className="h-px w-12 bg-border/50" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quickPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      className="group min-h-[140px] h-auto p-5 text-left justify-start bg-card/40 hover:bg-card border-border/50 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 rounded-2xl backdrop-blur-sm whitespace-normal"
                      onClick={() => handleQuickPrompt(prompt)}
                      disabled={isLoading}
                    >
                      <div className="flex flex-col gap-3 w-full h-full">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-auto">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-semibold text-foreground leading-snug group-hover:text-foreground transition-colors line-clamp-2 mt-auto whitespace-normal">
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
                      className={`rounded-3xl px-6 py-4 shadow-sm relative group/msg ${message.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-blue-700 text-primary-foreground shadow-primary/10'
                          : 'bg-card/80 backdrop-blur-sm text-foreground border border-border/50 hover:border-primary/30 transition-colors'
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
                          opportunities={message.opportunities}
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

      <div className="flex-none p-6 z-20">
        <form 
          onSubmit={handleSubmit} 
          className="relative max-w-4xl mx-auto flex items-center group"
        >
          <div className="absolute inset-0 bg-primary/5 blur-xl group-focus-within:bg-primary/10 transition-colors rounded-full -z-10" />
          
          <div className="relative flex-1 flex items-center bg-card/80 backdrop-blur-2xl border-2 border-border/50 group-focus-within:border-primary/40 group-focus-within:shadow-2xl group-focus-within:shadow-primary/5 transition-all duration-300 rounded-[2rem] px-2 py-2 overflow-hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-full ml-2 text-muted-foreground group-focus-within:text-primary transition-colors">
              <Sparkles className="h-5 w-5" />
            </div>
            
            <Input
              placeholder="Ask me anything about your career..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isDiscovering}
              className="flex-1 h-12 text-base bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 placeholder:text-muted-foreground/60"
            />
            
            <Button 
              type="submit" 
              size="icon" 
              disabled={isLoading || isDiscovering || !input.trim()} 
              className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
})
ChatInterface.displayName = 'ChatInterface'
