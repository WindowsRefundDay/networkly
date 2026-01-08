"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Milestone, Sparkles, Code } from "lucide-react"
import { projectUpdates } from "@/lib/mock-data"
import type React from "react"

const updateTypeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  milestone: { icon: Milestone, color: "text-secondary bg-secondary/10" },
  update: { icon: Activity, color: "text-primary bg-primary/10" },
  feature: { icon: Code, color: "text-amber-500 bg-amber-500/10" },
}

export function ProjectUpdatesFeed() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5 text-primary" />
          Recent Updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projectUpdates.map((update) => {
          const config = updateTypeConfig[update.type] || updateTypeConfig.update
          const Icon = config.icon
          return (
            <div key={update.id} className="flex gap-3">
              <div className={`rounded-full p-2 h-fit ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{update.content}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {update.projectTitle}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{update.timestamp}</span>
                </div>
              </div>
            </div>
          )
        })}

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI tracks your project progress automatically
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
