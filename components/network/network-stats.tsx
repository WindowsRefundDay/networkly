"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Card, CardContent } from "@/components/ui/card"
import { Users, UserPlus, MessageCircle, TrendingUp, Loader2 } from "lucide-react"
import { getNetworkStats } from "@/app/actions/connections"

export function NetworkStats() {
  const [stats, setStats] = useState({
    totalConnections: 0,
    pendingRequests: 0,
    unreadMessages: 0,
    profileViews: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getNetworkStats()
        setStats(data)
      } catch (error) {
        console.error("Failed to fetch network stats:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <GlassCard key={i} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-center h-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </GlassCard>
        ))}
      </div>
    )
  }

  const statsArr = [
    {
      label: "Total Connections",
      value: stats.totalConnections.toString(),
      change: "",
      icon: Users,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Pending Requests",
      value: stats.pendingRequests.toString(),
      change: "",
      icon: UserPlus,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      label: "Unread Messages",
      value: stats.unreadMessages.toString(),
      change: "",
      icon: MessageCircle,
      color: "text-secondary bg-secondary/10",
    },
    {
      label: "Profile Views",
      value: stats.profileViews.toString(),
      change: "",
      icon: TrendingUp,
      color: "text-rose-500 bg-rose-500/10",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsArr.map((stat) => (
        <GlassCard key={stat.label} className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              {stat.change && <span className="ml-auto text-xs text-secondary font-medium">{stat.change}</span>}
            </div>
          </CardContent>
        </GlassCard>
      ))}
    </div>
  )
}
