/**
 * React Hook for AI Chat - Client-side integration with the AI Model Manager
 */

'use client'

import { useState, useCallback, useRef } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
}

interface UseAIChatOptions {
  /** API endpoint for chat */
  api?: string
  /** Initial messages */
  initialMessages?: Message[]
  /** System prompt */
  systemPrompt?: string
  /** Use case for model selection */
  useCase?: string
  /** Called when response is complete */
  onFinish?: (message: Message) => void
  /** Called on error */
  onError?: (error: Error) => void
}

interface UseAIChatReturn {
  /** Current messages */
  messages: Message[]
  /** Current input value */
  input: string
  /** Set input value */
  setInput: (value: string) => void
  /** Send a message */
  sendMessage: (content?: string) => Promise<void>
  /** Whether a request is in progress */
  isLoading: boolean
  /** Current error */
  error: Error | null
  /** Stop the current stream */
  stop: () => void
  /** Clear all messages */
  clear: () => void
  /** Reload the last message */
  reload: () => Promise<void>
}

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const {
    api = '/api/chat',
    initialMessages = [],
    systemPrompt,
    useCase = 'chat',
    onFinish,
    onError,
  } = options

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  const sendMessage = useCallback(async (content?: string) => {
    const messageContent = content ?? input
    if (!messageContent.trim()) return

    // Clear input immediately
    setInput('')
    setError(null)
    setIsLoading(true)

    // Create user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      createdAt: new Date(),
    }

    // Create placeholder assistant message
    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])

    // Prepare messages for API
    const apiMessages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: messageContent },
    ]

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          useCase,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.textDelta || parsed.content) {
                accumulatedContent += parsed.textDelta || parsed.content
                setMessages(prev => {
                  const updated = [...prev]
                  const lastIdx = updated.length - 1
                  if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      content: accumulatedContent,
                    }
                  }
                  return updated
                })
              }
              if (parsed.error) {
                throw new Error(parsed.error)
              }
            } catch (e) {
              // Skip malformed JSON unless it's our error
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                throw e
              }
            }
          }
        }
      }

      // Finalize message
      const finalMessage: Message = {
        id: assistantMessage.id,
        role: 'assistant',
        content: accumulatedContent,
        createdAt: new Date(),
      }

      setMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (lastIdx >= 0) {
          updated[lastIdx] = finalMessage
        }
        return updated
      })

      onFinish?.(finalMessage)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled - remove the empty assistant message
        setMessages(prev => prev.slice(0, -1))
        return
      }

      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)

      // Remove the empty assistant message on error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [api, input, messages, onError, onFinish, systemPrompt, useCase])

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const clear = useCallback(() => {
    setMessages(initialMessages)
    setError(null)
  }, [initialMessages])

  const reload = useCallback(async () => {
    if (messages.length < 2) return

    // Get the last user message
    const lastUserMessageIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserMessageIdx === -1) return

    const actualIdx = messages.length - 1 - lastUserMessageIdx
    const lastUserMessage = messages[actualIdx]

    // Remove messages from the last user message onwards
    setMessages(prev => prev.slice(0, actualIdx))

    // Resend
    await sendMessage(lastUserMessage.content)
  }, [messages, sendMessage])

  return {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    error,
    stop,
    clear,
    reload,
  }
}

// Completion hook for non-chat use cases
interface UseAICompletionOptions {
  api?: string
  useCase?: string
  onFinish?: (result: { content: string; model: string }) => void
  onError?: (error: Error) => void
}

interface UseAICompletionReturn {
  complete: (prompt: string, systemPrompt?: string) => Promise<string>
  isLoading: boolean
  error: Error | null
  result: string | null
}

export function useAICompletion(options: UseAICompletionOptions = {}): UseAICompletionReturn {
  const {
    api = '/api/ai/complete',
    useCase = 'chat',
    onFinish,
    onError,
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const complete = useCallback(async (prompt: string, systemPrompt?: string): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          systemPrompt,
          useCase,
          stream: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setResult(data.content)
      onFinish?.({ content: data.content, model: data.model })
      return data.content
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [api, onError, onFinish, useCase])

  return {
    complete,
    isLoading,
    error,
    result,
  }
}
