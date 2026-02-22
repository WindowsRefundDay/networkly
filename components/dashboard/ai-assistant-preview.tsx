"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Send, ArrowRight } from "lucide-react"
import Link from "next/link"

const quickActions = [
  "Help me prepare for my Google interview",
  "Find internships in AI/ML",
  "Draft a networking message",
  "Suggest my next career move",
]

export function AIAssistantPreview() {
  const [input, setInput] = useState("")

  return (
    <GlassCard className="border-border bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          AI Career Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Get personalized career advice, networking strategies, and application help powered by AI.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Ask anything about your career..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="bg-card"
          />
          <Button size="icon" className="shrink-0" aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button key={action} variant="outline" size="sm" className="text-xs h-auto py-1.5 bg-transparent">
                {action}
              </Button>
            ))}
          </div>
        </div>
        <Link href="/assistant">
          <Button variant="ghost" className="w-full gap-1 text-primary">
            Open Full Assistant
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </GlassCard>
  )
}
