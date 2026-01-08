import { ChatInterface } from "@/components/assistant/chat-interface"
import { AIToolsSidebar } from "@/components/assistant/ai-tools-sidebar"

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Career Assistant</h1>
        <p className="text-muted-foreground">Get personalized career advice and networking help</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <ChatInterface />
        </div>
        <div>
          <AIToolsSidebar />
        </div>
      </div>
    </div>
  )
}
