'use client'

/**
 * ChatInterface — ChatGPT-style AI chat with:
 * - Conversation sidebar with history (localStorage)
 * - Streaming responses with stop button
 * - Expandable textarea (Enter send, Shift+Enter newline)
 * - Copy message / Regenerate on hover
 * - Timestamps on messages
 * - Markdown with syntax-highlighted code blocks + copy button
 * - Tool calling (opportunities, bookmarks, discovery)
 * - Auto-scroll
 */

import type React from 'react'
import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sparkles, Send, User, Square, Plus, MessageSquare, Trash2,
  PanelLeftClose, PanelLeft, Copy, Check, RefreshCw, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSupabaseUser } from '@/hooks/use-supabase-user'
import { messageEntranceVariants, staggerContainerVariants, fadeInUpVariants } from './animations'

import { OpportunityGrid, type InlineOpportunity } from './opportunity-card-inline'
import { DiscoveryLoading, TypingIndicator } from './simple-loading'
import { WebDiscoveryConfirm } from './action-buttons'
import { MarkdownMessage } from './markdown-message'
import type { ChatSession } from '@/app/actions/chat'
import { useInlineDiscovery } from '@/hooks/use-inline-discovery'

// ─── Types ──────────────────────────────────────────────────────
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  opportunities?: InlineOpportunity[]
  opportunityCache?: Record<string, InlineOpportunity>
  isStreaming?: boolean
  toolStatus?: string
  discoveryPrompt?: { query: string }
}

interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
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

// ─── Helpers ────────────────────────────────────────────────────
const STORAGE_KEY = 'networkly-ai-conversations'
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const generateConvoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

function generateTitle(text: string): string {
  const cleaned = text.replace(/\n/g, ' ').trim()
  return cleaned.length <= 40 ? cleaned : cleaned.slice(0, 40).trimEnd() + '...'
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveConversations(convos: Conversation[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convos)) } catch { /* full */ }
}

// ─── Quick Prompts ──────────────────────────────────────────────
const quickPrompts = [
  'Find me STEM internships for this summer',
  'What opportunities match my skills?',
  'Help me prepare for my interview',
  'Draft a networking message',
  'What skills should I learn next?',
  'Show me my saved opportunities',
]

const STREAM_FLUSH_INTERVAL_MS = 50

interface PendingStreamUpdate {
  convoId: string
  assistantId: string
  content: string
  opportunities: InlineOpportunity[]
  opportunityCache: Record<string, InlineOpportunity>
}

// ─── Main Component ─────────────────────────────────────────────
export const ChatInterface = forwardRef<ChatInterfaceRef>((_, ref) => {
  // ── Conversation state ────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const initialized = useRef(false)

  // ── Chat state ────────────────────────────────────────────────
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const [pendingDiscoveryQuery, setPendingDiscoveryQuery] = useState<string | null>(null)
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const conversationsRef = useRef<Conversation[]>([])
  const activeIdRef = useRef<string | null>(null)
  const pendingStreamUpdateRef = useRef<PendingStreamUpdate | null>(null)
  const streamFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { user } = useSupabaseUser()

  const userName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split('@')[0] || 'User'
  const userAvatar = (user?.user_metadata?.avatar_url as string | undefined) || '/placeholder.svg'

  // ── Active conversation ───────────────────────────────────────
  const activeConvo = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  )
  const messages = activeConvo?.messages ?? []

  // ── localStorage ──────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const loaded = loadConversations()
    setConversations(loaded)
    if (loaded.length > 0) setActiveId(loaded[0].id)
  }, [])

  useEffect(() => {
    if (!initialized.current) return
    saveConversations(conversations)
  }, [conversations])

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  // ── Opportunity cache ─────────────────────────────────────────
  const globalOpportunityCache = useMemo(() => {
    const cache: Record<string, InlineOpportunity> = {}
    for (const message of messages) {
      if (message.opportunities) {
        for (const opp of message.opportunities) cache[opp.id] = opp
      }
      if (message.opportunityCache) Object.assign(cache, message.opportunityCache)
    }
    return cache
  }, [messages])

  // ── Discovery ─────────────────────────────────────────────────
  const [currentDiscoveryId, setCurrentDiscoveryId] = useState<string | null>(null)
  const { progress: discoveryProgress, isActive: isDiscovering, startDiscovery, stopDiscovery } = useInlineDiscovery({
    onOpportunityFound: (opportunity) => {
      setConversations(prev => prev.map(c => {
        if (c.id !== activeIdRef.current) return c
        const msgs = c.messages.map(m => {
          if (m.id !== currentDiscoveryId) return m
          const newOpps = [...(m.opportunities || []), opportunity]
          return { ...m, opportunities: newOpps, opportunityCache: { ...(m.opportunityCache || {}), [opportunity.id]: opportunity } }
        })
        return { ...c, messages: msgs, updatedAt: Date.now() }
      }))
    },
    onComplete: (opportunities) => {
      setPendingDiscoveryQuery(null)
      const content = opportunities.length > 0
        ? `Great news! I found ${opportunities.length} opportunities for you:`
        : "I searched the web but couldn't find any new opportunities matching your criteria. Try a different search term?"
      const cache: Record<string, InlineOpportunity> = {}
      for (const opp of opportunities) cache[opp.id] = opp

      setConversations(prev => prev.map(c => {
        if (c.id !== activeIdRef.current) return c
        const msgs = c.messages.map(m =>
          m.id === currentDiscoveryId
            ? { ...m, content, opportunities, opportunityCache: cache, isStreaming: false }
            : m
        )
        return { ...c, messages: msgs, updatedAt: Date.now() }
      }))
      setCurrentDiscoveryId(null)
    },
    onError: (error) => {
      setPendingDiscoveryQuery(null)
      const currentActiveId = activeIdRef.current
      if (currentActiveId) {
        pushMessage(currentActiveId, {
          id: generateId(), role: 'assistant', content: `Sorry, I encountered an issue while searching: ${error}. Please try again.`, timestamp: Date.now(),
        })
      }
    },
  })

  // ── Auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolStatus, discoveryProgress])

  useEffect(() => {
    if (!isLoading) return
    const interval = setInterval(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }, 100)
    return () => clearInterval(interval)
  }, [isLoading])

  useEffect(() => () => {
    if (streamFlushTimerRef.current) {
      clearTimeout(streamFlushTimerRef.current)
      streamFlushTimerRef.current = null
    }
  }, [])

  // ── Auto-resize textarea ──────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  // ── Conversation CRUD ─────────────────────────────────────────
  const createConversation = useCallback((): string => {
    const id = generateConvoId()
    const convo: Conversation = { id, title: 'New chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() }
    setConversations(prev => [convo, ...prev])
    setActiveId(id)
    setInput('')
    setIsLoading(false)
    setPendingDiscoveryQuery(null)
    return id
  }, [])

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id)
      if (activeId === id) {
        setActiveId(next.length > 0 ? next[0].id : null)
      }
      return next
    })
  }, [activeId])

  const switchConversation = useCallback((id: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    setActiveId(id)
    setInput('')
    setIsLoading(false)
    setToolStatus(null)
    setPendingDiscoveryQuery(null)
  }, [])

  // ── Message helpers ───────────────────────────────────────────
  const pushMessage = useCallback((convoId: string, msg: ChatMessage) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c
      const updated = { ...c, messages: [...c.messages, msg], updatedAt: Date.now() }
      if (c.title === 'New chat' && msg.role === 'user') {
        updated.title = generateTitle(msg.content)
      }
      return updated
    }))
  }, [])

  const updateMessage = useCallback((convoId: string, msgId: string, updater: (m: ChatMessage) => ChatMessage) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c
      return { ...c, messages: c.messages.map(m => m.id === msgId ? updater(m) : m), updatedAt: Date.now() }
    }))
  }, [])

  const flushPendingStreamUpdate = useCallback((force: boolean = false) => {
    if (!pendingStreamUpdateRef.current) return
    if (streamFlushTimerRef.current) {
      clearTimeout(streamFlushTimerRef.current)
      streamFlushTimerRef.current = null
    }

    if (!force) return

    const pending = pendingStreamUpdateRef.current
    updateMessage(pending.convoId, pending.assistantId, (m) => ({
      ...m,
      content: pending.content,
      opportunities: pending.opportunities.length > 0 ? pending.opportunities : m.opportunities,
      opportunityCache: pending.opportunityCache,
    }))
  }, [updateMessage])

  const scheduleStreamFlush = useCallback(() => {
    if (streamFlushTimerRef.current) return

    streamFlushTimerRef.current = setTimeout(() => {
      streamFlushTimerRef.current = null
      const pending = pendingStreamUpdateRef.current
      if (!pending) return

      updateMessage(pending.convoId, pending.assistantId, (m) => ({
        ...m,
        content: pending.content,
        opportunities: pending.opportunities.length > 0 ? pending.opportunities : m.opportunities,
        opportunityCache: pending.opportunityCache,
      }))
    }, STREAM_FLUSH_INTERVAL_MS)
  }, [updateMessage])

  // ── Card helpers ──────────────────────────────────────────────
  const getEmbeddedCardIds = (content: string): string[] => {
    const cardPattern = /\{\{card:([a-zA-Z0-9-_]+)\}\}/g
    const ids: string[] = []
    let match
    while ((match = cardPattern.exec(content)) !== null) ids.push(match[1])
    return ids
  }

  const embeddedCardIdMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const message of messages) {
      map.set(message.id, new Set(getEmbeddedCardIds(message.content)))
    }
    return map
  }, [messages])

  const filterOpportunitiesForGrid = useCallback((message: ChatMessage): InlineOpportunity[] => {
    if (!message.opportunities || message.opportunities.length === 0) return []
    const embedded = embeddedCardIdMap.get(message.id)
    if (!embedded || embedded.size === 0) return message.opportunities
    return message.opportunities.filter((opportunity) => !embedded.has(opportunity.id))
  }, [embeddedCardIdMap])

  // ── Send message ──────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const trimmedText = text.trim()
    let convoId = activeIdRef.current
    if (!convoId) {
      convoId = createConversation()
    }

    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: trimmedText, timestamp: Date.now() }
    pushMessage(convoId, userMsg)
    setInput('')
    setIsLoading(true)
    setToolStatus(null)

    const assistantId = generateId()
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true }
    pushMessage(convoId, assistantMsg)

    pendingStreamUpdateRef.current = {
      convoId,
      assistantId,
      content: '',
      opportunities: [],
      opportunityCache: {},
    }

    try {
      // Build API messages from current conversation
      let apiMessages: { role: string; content: string }[] = []
      const convo = conversationsRef.current.find(c => c.id === convoId)
      if (convo) {
        apiMessages = convo.messages.filter(m => !m.isStreaming).map(m => ({ role: m.role, content: m.content }))
      }
      apiMessages.push({ role: 'user', content: trimmedText })

      abortControllerRef.current = new AbortController()

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, stream: true }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) throw new Error('Failed to send message')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const event: StreamEvent = JSON.parse(data)
            switch (event.type) {
              case 'text-delta':
                if (pendingStreamUpdateRef.current) {
                  pendingStreamUpdateRef.current.content += event.textDelta || ''
                  scheduleStreamFlush()
                }
                setToolStatus(null)
                break
              case 'tool-status':
                setToolStatus(event.status || null)
                break
              case 'opportunities':
                if (event.opportunities && pendingStreamUpdateRef.current) {
                  const cache = pendingStreamUpdateRef.current.opportunityCache
                  for (const opp of event.opportunities) {
                    cache[opp.id] = opp
                  }
                  pendingStreamUpdateRef.current.opportunities = Object.values(cache)
                  scheduleStreamFlush()
                }
                break
              case 'trigger_discovery':
                if (event.query) setPendingDiscoveryQuery(event.query)
                break
              case 'error':
                if (pendingStreamUpdateRef.current) {
                  pendingStreamUpdateRef.current.content += '\n\nSorry, something went wrong. Please try again.'
                  flushPendingStreamUpdate(true)
                }
                updateMessage(convoId, assistantId, (m) => ({ ...m, isStreaming: false }))
                break
            }
          } catch { /* partial chunk */ }
        }
      }

      flushPendingStreamUpdate(true)
      const finalPending = pendingStreamUpdateRef.current

      updateMessage(convoId, assistantId, (m) => ({
        ...m,
        content: finalPending?.content || m.content,
        opportunities: finalPending && finalPending.opportunities.length > 0 ? finalPending.opportunities : m.opportunities,
        opportunityCache: finalPending?.opportunityCache || m.opportunityCache,
        isStreaming: false,
      }))
    } catch (error) {
      flushPendingStreamUpdate(true)
      if ((error as Error).name !== 'AbortError') {
        updateMessage(convoId, assistantId, m => ({
          ...m, content: m.content || 'Sorry, I encountered an error. Please try again.', isStreaming: false,
        }))
      } else {
        updateMessage(convoId, assistantId, m => ({
          ...m, content: m.content || '*Response cancelled.*', isStreaming: false,
        }))
      }
    } finally {
      pendingStreamUpdateRef.current = null
      setIsLoading(false)
      setToolStatus(null)
      abortControllerRef.current = null
    }
  }, [isLoading, createConversation, pushMessage, updateMessage, scheduleStreamFlush, flushPendingStreamUpdate])

  // ── Stop streaming ────────────────────────────────────────────
  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  // ── Regenerate ────────────────────────────────────────────────
  const regenerate = useCallback(() => {
    if (!activeConvo || isLoading) return
    const msgs = activeConvo.messages
    let lastUserContent = ''
    let lastAssistantIdx = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant' && lastAssistantIdx === -1) lastAssistantIdx = i
      if (msgs[i].role === 'user') { lastUserContent = msgs[i].content; break }
    }
    if (!lastUserContent) return

    if (lastAssistantIdx >= 0) {
      setConversations(prev => prev.map(c => {
        if (c.id !== activeId) return c
        const newMsgs = [...c.messages]
        newMsgs.splice(lastAssistantIdx, 1)
        return { ...c, messages: newMsgs, updatedAt: Date.now() }
      }))
    }

    setTimeout(() => sendMessage(lastUserContent), 50)
  }, [activeConvo, activeId, isLoading, sendMessage])

  // ── Copy message ──────────────────────────────────────────────
  const copyMessage = useCallback((msgId: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMsgId(msgId)
      setTimeout(() => setCopiedMsgId(null), 2000)
    })
  }, [])

  // ── Bookmark ──────────────────────────────────────────────────
  const handleBookmark = async (opportunityId: string, opportunityTitle: string) => {
    if (bookmarkedIds.has(opportunityId)) return
    setBookmarkingId(opportunityId)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], confirmBookmark: { opportunityId, opportunityTitle } }),
      })
      const result = await response.json()
      if (result.success) {
        setBookmarkedIds(prev => new Set([...prev, opportunityId]))
        const currentActiveId = activeIdRef.current
        if (currentActiveId) {
          pushMessage(currentActiveId, {
            id: generateId(), role: 'assistant', content: result.message, timestamp: Date.now(),
          })
        }
      }
    } catch (error) {
      console.error('[Bookmark Error]', error)
    } finally {
      setBookmarkingId(null)
    }
  }

  // ── Discovery ─────────────────────────────────────────────────
  const handleConfirmDiscovery = () => {
    if (!pendingDiscoveryQuery || !activeId) return
    const discoveryId = generateId()
    setCurrentDiscoveryId(discoveryId)
    pushMessage(activeId, {
      id: discoveryId, role: 'assistant', content: '', timestamp: Date.now(), opportunities: [], isStreaming: true,
    })
    startDiscovery(pendingDiscoveryQuery)
  }

  const handleCancelDiscovery = () => {
    setPendingDiscoveryQuery(null)
    if (activeId) {
      pushMessage(activeId, {
        id: generateId(), role: 'assistant', content: "No problem! Let me know if you'd like to search for something else.", timestamp: Date.now(),
      })
    }
  }

  // ── New chat ──────────────────────────────────────────────────
  const handleNewChat = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    stopDiscovery()
    createConversation()
  }

  // ── Expose ref ────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    sendMessage: (text: string) => sendMessage(text),
    loadSession: (session: ChatSession) => {
      if (session && session.messages.length > 0) {
        const id = createConversation()
        const msgs: ChatMessage[] = session.messages.map((m, i) => {
          const cache: Record<string, InlineOpportunity> = {}
          if (m.opportunities) {
            for (const opp of m.opportunities as InlineOpportunity[]) cache[opp.id] = opp
          }
          return {
            id: `loaded-${i}`,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: Date.now(),
            opportunities: m.opportunities as InlineOpportunity[] | undefined,
            opportunityCache: Object.keys(cache).length > 0 ? cache : undefined,
          }
        })
        setConversations(prev => prev.map(c =>
          c.id === id ? { ...c, messages: msgs, title: session.title || 'Loaded session', updatedAt: Date.now() } : c
        ))
      }
    },
  }))

  // ── Keyboard ──────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && input.trim()) sendMessage(input)
    }
  }

  // ── Sidebar grouping ─────────────────────────────────────────
  const groups = useMemo(() => {
    const dayMs = 86_400_000
    const now = Date.now()
    const todayStart = new Date(now).setHours(0, 0, 0, 0)
    const grouped = [
      { label: 'Today', items: [] as Conversation[] },
      { label: 'Yesterday', items: [] as Conversation[] },
      { label: 'Previous 7 days', items: [] as Conversation[] },
      { label: 'Older', items: [] as Conversation[] },
    ]

    for (const convo of conversations) {
      if (convo.updatedAt >= todayStart) grouped[0].items.push(convo)
      else if (convo.updatedAt >= todayStart - dayMs) grouped[1].items.push(convo)
      else if (convo.updatedAt >= now - 7 * dayMs) grouped[2].items.push(convo)
      else grouped[3].items.push(convo)
    }

    return grouped
  }, [conversations])

  const canSend = input.trim().length > 0 && !isLoading && !isDiscovering

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-border/40 bg-background">
      {/* ═══════ Sidebar ═══════ */}
      <aside className={cn(
        'flex flex-col h-full bg-muted/30 border-r border-border/50 transition-all duration-200 shrink-0',
        sidebarOpen ? 'w-64' : 'w-12'
      )}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-3 border-b border-border/30">
          {sidebarOpen && (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
              New chat
            </button>
          )}
          {!sidebarOpen && (
            <button onClick={handleNewChat} className="mx-auto p-1 rounded-md hover:bg-muted transition-colors" title="New chat">
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            title={sidebarOpen ? 'Collapse' : 'Expand'}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {sidebarOpen ? (
            <div className="space-y-3 px-2">
              {groups.map(g => g.items.length > 0 && (
                <div key={g.label}>
                  <p className="px-2 mb-1 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">{g.label}</p>
                  <div className="space-y-0.5">
                    {g.items.map(c => (
                      <div
                        key={c.id}
                        className={cn(
                          'group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors',
                          activeId === c.id ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                        onClick={() => switchConversation(c.id)}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate flex-1">{c.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConversation(c.id) }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground/40 text-center py-8 px-4">No conversations yet</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 px-1">
              {conversations.slice(0, 15).map(c => (
                <button
                  key={c.id}
                  onClick={() => switchConversation(c.id)}
                  className={cn(
                    'p-1.5 rounded-md transition-colors w-full flex justify-center',
                    activeId === c.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                  )}
                  title={c.title}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ═══════ Main Chat ═══════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* ── Empty state ── */
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="relative flex flex-col items-center gap-4 max-w-2xl text-center">
                <div className="absolute -top-32 -left-32 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

                <motion.div
                  className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg"
                  animate={{ boxShadow: ['0 10px 25px -5px rgba(0,0,0,0.1)', '0 20px 35px -5px rgba(0,0,0,0.2)', '0 10px 25px -5px rgba(0,0,0,0.1)'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </motion.div>

                <h2 className="relative text-xl font-bold text-foreground">How can I help you today?</h2>
                <p className="relative text-sm text-muted-foreground max-w-md">
                  I can find opportunities, help with applications, and give career advice — all personalized to your profile.
                </p>

                <motion.div
                  className="relative w-full mt-4"
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickPrompts.map((prompt) => (
                      <motion.button
                        key={prompt}
                        variants={fadeInUpVariants}
                        onClick={() => sendMessage(prompt)}
                        disabled={isLoading}
                        className="text-left text-xs px-3 py-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors leading-snug"
                      >
                        {prompt}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          ) : (
            /* ── Message list ── */
            <div className="max-w-3xl mx-auto py-4 space-y-1">
              {messages.map((message, idx) => {
                const isUser = message.role === 'user'
                const isLast = message.role === 'assistant' && idx === messages.length - 1

                return (
                  <motion.div
                    key={message.id}
                    className={cn('group flex gap-3 px-4 py-3', isUser ? 'justify-end' : 'justify-start')}
                    variants={messageEntranceVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {/* Assistant avatar */}
                    {!isUser && (
                      <div className="shrink-0 mt-0.5">
                        <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                          <Sparkles className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}

                    <div className={cn(
                      'flex flex-col min-w-0',
                      isUser ? 'max-w-[75%] items-end' : 'max-w-[85%]'
                    )}>
                      {/* Bubble */}
                      <div className={cn(
                        'rounded-2xl px-4 py-3 text-sm break-words',
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-br-md shadow-sm'
                          : 'backdrop-blur-sm bg-muted/60 text-foreground border border-border/30 rounded-bl-md'
                      )}>
                        {message.content ? (
                          isUser ? (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          ) : (
                            <MarkdownMessage
                              content={message.content}
                              opportunityCache={globalOpportunityCache}
                              onBookmark={handleBookmark}
                              bookmarkingId={bookmarkingId || undefined}
                              bookmarkedIds={bookmarkedIds}
                            />
                          )
                        ) : message.isStreaming ? (
                          <TypingIndicator />
                        ) : null}
                      </div>

                      {/* Opportunities grid */}
                      {message.opportunities && message.opportunities.length > 0 && (
                        <div className="mt-3 w-full relative z-10">
                          <OpportunityGrid
                            opportunities={filterOpportunitiesForGrid(message)}
                            onBookmark={handleBookmark}
                            bookmarkingId={bookmarkingId || undefined}
                            bookmarkedIds={bookmarkedIds}
                          />
                        </div>
                      )}

                      {/* Timestamp + actions */}
                      <div className={cn('flex items-center gap-1.5 mt-1 px-1', isUser ? 'flex-row-reverse' : 'flex-row')}>
                        <span className="text-[10px] text-muted-foreground/40">{formatTime(message.timestamp)}</span>

                        {message.content && !message.isStreaming && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => copyMessage(message.id, message.content)}
                              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground/50 hover:text-foreground"
                              title="Copy message"
                            >
                              {copiedMsgId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                            {!isUser && isLast && (
                              <button
                                onClick={regenerate}
                                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground/50 hover:text-foreground"
                                title="Regenerate response"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User avatar */}
                    {isUser && (
                      <div className="shrink-0 mt-0.5">
                        <Avatar className="h-8 w-8 shadow-sm">
                          <AvatarImage src={userAvatar} alt={userName} />
                          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </motion.div>
                )
              })}

              {/* Tool status indicator */}
              {toolStatus && (
                <div className="flex gap-3 px-4 py-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">{toolStatus}</div>
                </div>
              )}

              {/* Discovery confirmation */}
              {pendingDiscoveryQuery && !isDiscovering && (
                <div className="flex gap-3 px-4 py-2">
                  <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <WebDiscoveryConfirm
                    query={pendingDiscoveryQuery}
                    onConfirm={handleConfirmDiscovery}
                    onCancel={handleCancelDiscovery}
                    className="flex-1"
                  />
                </div>
              )}

              {/* Discovery progress */}
              {isDiscovering && (
                <div className="flex gap-3 px-4 py-2">
                  <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <DiscoveryLoading foundCount={discoveryProgress.foundCount} className="flex-1" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{discoveryProgress.message}</span>
                      <Button variant="ghost" size="sm" onClick={() => stopDiscovery()} className="h-7 text-xs">
                        <X className="h-3 w-3 mr-1" /> Stop
                      </Button>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${discoveryProgress.progress}%` }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ═══════ Input Area ═══════ */}
        <div className="flex-none border-t border-border/30 bg-background/80 backdrop-blur-sm px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-muted/40 border border-border/50 rounded-2xl px-4 py-2 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/10 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your career..."
                disabled={isLoading || isDiscovering}
                rows={1}
                className={cn(
                  'flex-1 bg-transparent resize-none text-sm outline-none placeholder:text-muted-foreground/50',
                  'min-h-[24px] max-h-[200px] py-1 leading-relaxed',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
              {isLoading ? (
                <button
                  onClick={stopStreaming}
                  className="shrink-0 h-8 w-8 rounded-lg bg-foreground/10 hover:bg-foreground/20 flex items-center justify-center transition-colors"
                  title="Stop generating"
                >
                  <Square className="h-3.5 w-3.5 text-foreground" />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!canSend}
                  className={cn(
                    'shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-all',
                    canSend
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                  )}
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
})
ChatInterface.displayName = 'ChatInterface'
