"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Sparkles, SlidersHorizontal } from "lucide-react"
import { ConnectionCard } from "@/components/network/connection-card"
import { MessagesPanel } from "@/components/network/messages-panel"
import { NetworkStats } from "@/components/network/network-stats"
import { networkConnections } from "@/lib/mock-data"

export default function NetworkPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [connections, setConnections] = useState(networkConnections)

  const connectedUsers = connections.filter((c) => c.status === "connected")
  const pendingUsers = connections.filter((c) => c.status === "pending")
  const suggestedUsers = connections.filter((c) => c.status === "suggested")

  const filteredConnections = (list: typeof connections) =>
    list.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.headline.toLowerCase().includes(searchQuery.toLowerCase()),
    )

  const handleConnect = (id: string) => {
    setConnections(connections.map((c) => (c.id === id ? { ...c, status: "pending" as const } : c)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Network</h1>
          <p className="text-muted-foreground">Grow your professional connections with AI-powered suggestions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-1 bg-transparent">
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <NetworkStats />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({connections.length})</TabsTrigger>
              <TabsTrigger value="connected">Connected ({connectedUsers.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingUsers.length})</TabsTrigger>
              <TabsTrigger value="suggested">
                <Sparkles className="h-4 w-4 mr-1" />
                Suggested ({suggestedUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6 space-y-4">
              {filteredConnections(connections).map((connection) => (
                <ConnectionCard key={connection.id} connection={connection} onConnect={handleConnect} />
              ))}
            </TabsContent>

            <TabsContent value="connected" className="mt-6 space-y-4">
              {filteredConnections(connectedUsers).map((connection) => (
                <ConnectionCard key={connection.id} connection={connection} onConnect={handleConnect} />
              ))}
            </TabsContent>

            <TabsContent value="pending" className="mt-6 space-y-4">
              {filteredConnections(pendingUsers).map((connection) => (
                <ConnectionCard key={connection.id} connection={connection} onConnect={handleConnect} />
              ))}
            </TabsContent>

            <TabsContent value="suggested" className="mt-6 space-y-4">
              {filteredConnections(suggestedUsers).map((connection) => (
                <ConnectionCard key={connection.id} connection={connection} onConnect={handleConnect} />
              ))}
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <MessagesPanel />
        </div>
      </div>
    </div>
  )
}
