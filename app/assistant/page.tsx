'use client'

import dynamic from 'next/dynamic'
import { PerformanceErrorBoundary } from '@/components/ui/performance-error-boundary'

const ChatInterface = dynamic(
  () => import('@/components/assistant/chat-interface').then((module) => module.ChatInterface),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading assistant...
      </div>
    ),
  }
)

export default function AssistantPage() {
  return (
    <div className="h-full flex flex-col min-w-0">
      <PerformanceErrorBoundary title="Assistant failed to load" message="Refresh to restore the AI assistant chat interface.">
        <ChatInterface />
      </PerformanceErrorBoundary>
    </div>
  )
}
