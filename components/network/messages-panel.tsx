"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ArrowRight, MessageCircle, Loader2 } from "lucide-react"
import { getMessages } from "@/app/actions/messages"

interface Message {
  id: string
  senderName: string
  senderAvatar: string | null
  preview: string
  timestamp: string
  unread: boolean
}

export function MessagesPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMessages()
      .then((data) => setMessages(data as Message[]))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Could not load messages.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <MessageCircle className="h-5 w-5 text-primary" />
          Messages
        </CardTitle>
        <Button variant="ghost" size="sm" className="gap-1 text-primary">
          View All
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={message.senderAvatar || "/placeholder.svg"} alt={message.senderName} />
                <AvatarFallback>{message.senderName[0]}</AvatarFallback>
              </Avatar>
              {message.unread && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-card" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-medium ${message.unread ? "text-foreground" : "text-muted-foreground"}`}>
                  {message.senderName}
                </span>
                <span className="text-xs text-muted-foreground">{message.timestamp}</span>
              </div>
              <p className={`text-sm truncate ${message.unread ? "text-foreground" : "text-muted-foreground"}`}>
                {message.preview}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
