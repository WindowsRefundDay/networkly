"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { UserPlus, MessageCircle, Sparkles, Check, Clock, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Connection {
  id: string
  name: string
  headline: string
  avatar: string
  mutualConnections: number
  matchReason: string
  status: "connected" | "pending" | "suggested"
  connectedDate: string | null
}

interface ConnectionCardProps {
  connection: Connection
  onConnect?: (id: string) => void
  onMessage?: (id: string) => void
}

export function ConnectionCard({ connection, onConnect, onMessage }: ConnectionCardProps) {
  const statusConfig = {
    connected: { label: "Connected", color: "bg-secondary/10 text-secondary", icon: Check },
    pending: { label: "Pending", color: "bg-amber-500/10 text-amber-500", icon: Clock },
    suggested: { label: "Suggested", color: "bg-primary/10 text-primary", icon: Sparkles },
  }

  const config = statusConfig[connection.status]
  const StatusIcon = config.icon

  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={connection.avatar || "/placeholder.svg"} alt={connection.name} />
            <AvatarFallback>{connection.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-foreground">{connection.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-1">{connection.headline}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Profile</DropdownMenuItem>
                  <DropdownMenuItem>Remove Connection</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={`${config.color} border-0 gap-1`}>
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{connection.mutualConnections} mutual connections</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-primary">
              <Sparkles className="h-3 w-3" />
              <span>{connection.matchReason}</span>
            </div>

            <div className="flex gap-2 pt-1">
              {connection.status === "suggested" && (
                <Button size="sm" className="gap-1" onClick={() => onConnect?.(connection.id)}>
                  <UserPlus className="h-4 w-4" />
                  Connect
                </Button>
              )}
              {connection.status === "connected" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 bg-transparent"
                  onClick={() => onMessage?.(connection.id)}
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </Button>
              )}
              {connection.status === "pending" && (
                <Button size="sm" variant="outline" disabled className="gap-1 bg-transparent">
                  <Clock className="h-4 w-4" />
                  Pending
                </Button>
              )}
              <Button size="sm" variant="ghost" className="gap-1 text-primary">
                <Sparkles className="h-4 w-4" />
                AI Intro
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
