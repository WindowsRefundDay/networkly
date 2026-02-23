'use client'

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, RefreshCw, Sparkles, User } from 'lucide-react'

import { OpportunityGrid, type InlineOpportunity } from '@/components/assistant/opportunity-card-inline'
import { MarkdownMessage } from '@/components/assistant/markdown-message'
import { TypingIndicator } from '@/components/assistant/simple-loading'
import type { ChatMessage } from '@/components/assistant/chat-types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PerformanceErrorBoundary } from '@/components/ui/performance-error-boundary'
import { cn } from '@/lib/utils'

import { messageEntranceVariants } from './animations'

interface ChatMessageListProps {
  messages: ChatMessage[]
  globalOpportunityCache: Record<string, InlineOpportunity>
  bookmarkedIds: Set<string>
  bookmarkingId: string | null
  copiedMsgId: string | null
  userAvatar: string
  userName: string
  onBookmark: (opportunityId: string, opportunityTitle: string) => Promise<void>
  onCopyMessage: (msgId: string, content: string) => void
  onRegenerate: () => void
  getGridOpportunities: (message: ChatMessage) => InlineOpportunity[]
  formatTime: (timestamp: number) => string
}

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  globalOpportunityCache,
  bookmarkedIds,
  bookmarkingId,
  copiedMsgId,
  userAvatar,
  userName,
  onBookmark,
  onCopyMessage,
  onRegenerate,
  getGridOpportunities,
  formatTime,
}: ChatMessageListProps) {
  const lastAssistantMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') {
        return messages[i].id
      }
    }
    return null
  }, [messages])

  return (
    <PerformanceErrorBoundary title="Messages failed to render" className="mx-4 my-2">
      <div className="max-w-3xl mx-auto py-4 space-y-1">
        {messages.map((message) => {
          const isUser = message.role === 'user'
          const isLastAssistant = message.id === lastAssistantMessageId

          return (
            <motion.div
              key={message.id}
              className={cn('group flex gap-3 px-4 py-3', isUser ? 'justify-end' : 'justify-start')}
              variants={messageEntranceVariants}
              initial="hidden"
              animate="visible"
            >
              {!isUser && (
                <div className="shrink-0 mt-0.5">
                  <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              )}

              <div className={cn('flex flex-col min-w-0', isUser ? 'max-w-[75%] items-end' : 'max-w-[85%]')}>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm break-words',
                    isUser
                      ? 'bg-primary text-primary-foreground rounded-br-md shadow-sm'
                      : 'backdrop-blur-sm bg-muted/60 text-foreground border border-border/30 rounded-bl-md'
                  )}
                >
                  {message.content ? (
                    isUser ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <MarkdownMessage
                        content={message.content}
                        opportunityCache={globalOpportunityCache}
                        onBookmark={onBookmark}
                        bookmarkingId={bookmarkingId ?? undefined}
                        bookmarkedIds={bookmarkedIds}
                      />
                    )
                  ) : message.isStreaming ? (
                    <TypingIndicator />
                  ) : null}
                </div>

                {message.opportunities && message.opportunities.length > 0 && (
                  <div className="mt-3 w-full relative z-10">
                    <OpportunityGrid
                      opportunities={getGridOpportunities(message)}
                      onBookmark={onBookmark}
                      bookmarkingId={bookmarkingId ?? undefined}
                      bookmarkedIds={bookmarkedIds}
                    />
                  </div>
                )}

                <div className={cn('flex items-center gap-1.5 mt-1 px-1', isUser ? 'flex-row-reverse' : 'flex-row')}>
                  <span className="text-[10px] text-muted-foreground/40">{formatTime(message.timestamp)}</span>

                  {message.content && !message.isStreaming && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onCopyMessage(message.id, message.content)}
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground/50 hover:text-foreground"
                        title="Copy message"
                      >
                        {copiedMsgId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                      {!isUser && isLastAssistant && (
                        <button
                          onClick={onRegenerate}
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

              {isUser && (
                <div className="shrink-0 mt-0.5">
                  <Avatar className="h-8 w-8 shadow-sm">
                    <AvatarImage src={userAvatar} alt={userName} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </PerformanceErrorBoundary>
  )
})
