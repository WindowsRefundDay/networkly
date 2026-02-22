'use client'

import { useRef } from 'react'
import { ChatInterface, type ChatInterfaceRef } from '@/components/assistant/chat-interface'
import { PerformanceErrorBoundary } from '@/components/ui/performance-error-boundary'

export default function AssistantPage() {
  const chatRef = useRef<ChatInterfaceRef>(null)

  return (
    <div className="h-full flex flex-col min-w-0">
      <PerformanceErrorBoundary title="Assistant failed to load" message="Refresh to restore the AI assistant chat interface.">
        <ChatInterface ref={chatRef} />
      </PerformanceErrorBoundary>
    </div>
  )
}
