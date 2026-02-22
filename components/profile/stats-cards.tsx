"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, Eye, TrendingUp, Zap } from "lucide-react"

interface StatsCardsProps {
  connections: number
  views: number
  strength: number
  growth?: number
}

export function StatsCards({ connections, views, strength, growth = 0 }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <Card className="bg-primary/5 border-primary/10 overflow-hidden relative">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <Users className="h-5 w-5 text-primary" />
            {growth > 0 && (
              <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                +{growth}%
              </span>
            )}
          </div>
          <div>
            <div className="text-2xl font-bold">{connections}</div>
            <div className="text-xs text-muted-foreground">Connections</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/5 border-secondary/10 overflow-hidden relative">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <Eye className="h-5 w-5 text-secondary-foreground" />
          <div>
            <div className="text-2xl font-bold">{views}</div>
            <div className="text-xs text-muted-foreground">Profile Views</div>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-2 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-violet-500/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Profile Strength</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500">
                {strength}%
              </span>
              <span className="text-xs text-muted-foreground">Keep it up!</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
