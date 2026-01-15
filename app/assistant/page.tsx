'use client'

import { useRef } from 'react'
import { ChatInterface, type ChatInterfaceRef } from '@/components/assistant/chat-interface'
import { AIToolsSidebar } from '@/components/assistant/ai-tools-sidebar'
import type { ChatSession } from '@/app/actions/chat'

export default function AssistantPage() {
  const chatRef = useRef<ChatInterfaceRef>(null)

  const handleToolClick = (prompt: string) => {
    chatRef.current?.sendMessage(prompt)
  }

  const handleLoadSession = (session: ChatSession) => {
    chatRef.current?.loadSession(session)
  }

  return (
    <div className="h-full flex gap-6">
      <div className="flex-1 flex flex-col min-w-0">
        <ChatInterface ref={chatRef} />
      </div>
      <div className="hidden xl:block w-80 h-full overflow-y-auto pr-1">
        <AIToolsSidebar 
          onToolClick={handleToolClick}
          onLoadSession={handleLoadSession}
        />
      </div>
    </div>
  )
}
