"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, UserPlus, MessageCircle, TrendingUp } from "lucide-react"

const stats = [
  { label: "Total Connections", value: "847", change: "+12", icon: Users, color: "text-primary bg-primary/10" },
  { label: "Pending Requests", value: "5", change: "+2", icon: UserPlus, color: "text-amber-500 bg-amber-500/10" },
  { label: "Unread Messages", value: "3", change: "", icon: MessageCircle, color: "text-secondary bg-secondary/10" },
  { label: "Profile Views", value: "234", change: "+15%", icon: TrendingUp, color: "text-rose-500 bg-rose-500/10" },
]

export function NetworkStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border">
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
        </Card>
      ))}
    </div>
  )
}
