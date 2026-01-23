'use client'

/**
 * MarkdownMessage - Renders AI-generated markdown content with embedded opportunity cards
 * 
 * Supports:
 * - Basic markdown: bold, italic, lists, links, headers, inline code
 * - Card embedding syntax: {{card:OPPORTUNITY_ID}}
 * - Styled to match the chat bubble design system
 */

import { useState, useEffect, useMemo, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { OpportunityCardInline, type InlineOpportunity } from './opportunity-card-inline'
import { Loader2 } from 'lucide-react'

interface MarkdownMessageProps {
  content: string
  className?: string
  // Opportunity cache - pre-loaded from tool results
  opportunityCache?: Record<string, InlineOpportunity>
  // Callbacks for card actions
  onBookmark?: (id: string, title: string) => void
  bookmarkingId?: string
  bookmarkedIds?: Set<string>
}

// Card syntax pattern: {{card:OPPORTUNITY_ID}}
const CARD_PATTERN = /\{\{card:([a-zA-Z0-9-_]+)\}\}/g

// Component to render a single embedded card
function EmbeddedCard({
  opportunityId,
  cachedOpportunity,
  onBookmark,
  isBookmarking,
  isBookmarked,
}: {
  opportunityId: string
  cachedOpportunity?: InlineOpportunity
  onBookmark?: (id: string, title: string) => void
  isBookmarking?: boolean
  isBookmarked?: boolean
}) {
  const [opportunity, setOpportunity] = useState<InlineOpportunity | null>(
    cachedOpportunity || null
  )
  const [loading, setLoading] = useState(!cachedOpportunity)
  const [error, setError] = useState<string | null>(null)

  // Fetch opportunity if not in cache
  useEffect(() => {
    if (cachedOpportunity) {
      setOpportunity(cachedOpportunity)
      setLoading(false)
      return
    }

    const fetchOpportunity = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/opportunities/${opportunityId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Opportunity not found')
          } else {
            setError('Failed to load opportunity')
          }
          return
        }

        const data = await response.json()
        setOpportunity(data)
      } catch (err) {
        console.error('[EmbeddedCard] Fetch error:', err)
        setError('Failed to load opportunity')
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunity()
  }, [opportunityId, cachedOpportunity])

  if (loading) {
    return (
      <div className="my-3 p-4 rounded-xl border border-border bg-muted/30 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading opportunity...</span>
      </div>
    )
  }

  if (error || !opportunity) {
    return (
      <div className="my-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
        {error || 'Could not load opportunity'}
      </div>
    )
  }

  return (
    <div className="my-3">
      <OpportunityCardInline
        opportunity={opportunity}
        onBookmark={onBookmark}
        isBookmarking={isBookmarking}
        isBookmarked={isBookmarked}
      />
    </div>
  )
}

// Parse content and split into text segments and card embeds
function parseContentWithCards(content: string): Array<{ type: 'text' | 'card'; value: string }> {
  const parts: Array<{ type: 'text' | 'card'; value: string }> = []
  let lastIndex = 0
  
  // Reset regex state
  CARD_PATTERN.lastIndex = 0
  
  let match
  while ((match = CARD_PATTERN.exec(content)) !== null) {
    // Add text before the card
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index)
      if (textBefore.trim()) {
        parts.push({ type: 'text', value: textBefore })
      }
    }
    
    // Add the card
    parts.push({ type: 'card', value: match[1] })
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text after last card
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex)
    if (remainingText.trim()) {
      parts.push({ type: 'text', value: remainingText })
    }
  }
  
  // If no cards found, return the full content as text
  if (parts.length === 0 && content.trim()) {
    parts.push({ type: 'text', value: content })
  }
  
  return parts
}

export function MarkdownMessage({ 
  content, 
  className = '',
  opportunityCache = {},
  onBookmark,
  bookmarkingId,
  bookmarkedIds,
}: MarkdownMessageProps) {
  // Memoize parsed content
  const parsedParts = useMemo(() => parseContentWithCards(content), [content])
  
  const markdownComponents: Components = {
    // Paragraphs - remove margin on last paragraph
    p: ({ children }) => (
      <p className="mb-2 last:mb-0">{children}</p>
    ),
    
    // Bold text
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    
    // Italic text
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
    
    // Unordered lists
    ul: ({ children }) => (
      <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
    ),
    
    // Ordered lists
    ol: ({ children }) => (
      <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
    ),
    
    // List items
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    
    // Links - open in new tab
    a: ({ href, children }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-primary underline underline-offset-2 hover:no-underline transition-all"
      >
        {children}
      </a>
    ),
    
    // Headers (rarely used in chat but good to have)
    h1: ({ children }) => (
      <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold mb-1 mt-2 first:mt-0">{children}</h3>
    ),
    
    // Inline code
    code: ({ children }) => (
      <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    
    // Code blocks
    pre: ({ children }) => (
      <pre className="bg-muted/50 p-3 rounded-lg overflow-x-auto my-2 text-sm">
        {children}
      </pre>
    ),
    
    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-primary/50 pl-3 my-2 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
    
    // Horizontal rules
    hr: () => (
      <hr className="my-3 border-border" />
    ),
  }

  // If no card syntax found, render simple markdown
  if (parsedParts.length === 1 && parsedParts[0].type === 'text') {
    return (
      <div className={`text-base leading-relaxed ${className}`}>
        <ReactMarkdown components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  // Render mixed content: text segments + embedded cards
  return (
    <div className={`text-base leading-relaxed ${className}`}>
      {parsedParts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <ReactMarkdown key={index} components={markdownComponents}>
              {part.value}
            </ReactMarkdown>
          )
        }
        
        // Render embedded card
        return (
          <EmbeddedCard
            key={`card-${part.value}-${index}`}
            opportunityId={part.value}
            cachedOpportunity={opportunityCache[part.value]}
            onBookmark={onBookmark}
            isBookmarking={bookmarkingId === part.value}
            isBookmarked={bookmarkedIds?.has(part.value)}
          />
        )
      })}
    </div>
  )
}
