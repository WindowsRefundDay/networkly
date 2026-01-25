"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getMyProjectUpdates } from "@/app/actions/projects"
import type React from "react"

interface ProjectUpdate {
  id: string
  type: string
  content: string
  projectTitle: string
  timestamp: string
}

const updateTypeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  milestone: { icon: ({ className }: { className?: string }) => <i className={`bx bx-flag ${className}`} />, color: "text-secondary bg-secondary/10" },
  update: { icon: ({ className }: { className?: string }) => <i className={`bx bx-line-chart ${className}`} />, color: "text-primary bg-primary/10" },
  feature: { icon: ({ className }: { className?: string }) => <i className={`bx bx-code-alt ${className}`} />, color: "text-amber-500 bg-amber-500/10" },
}

export function ProjectUpdatesFeed() {
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMyProjectUpdates()
      .then((data: ProjectUpdate[]) => setProjectUpdates(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <GlassCard className="border-border">
        <CardContent className="flex items-center justify-center py-8">
          <i className="bx bx-loader-alt animate-spin text-2xl text-muted-foreground" />
        </CardContent>
      </GlassCard>
    )
  }

  if (error) {
    return (
      <GlassCard className="border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Could not load updates.</p>
        </CardContent>
      </GlassCard>
    )
  }

  if (projectUpdates.length === 0) {
    return (
      <GlassCard className="border-border">
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <i className='bx bx-line-chart text-xl text-primary' />
            Recent Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-muted p-3">
              <i className="bx bx-folder-open text-xl text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No updates yet</p>
            <p className="text-xs text-muted-foreground">Create a project to see updates here</p>
          </div>
        </CardContent>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="border-border">
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <i className='bx bx-line-chart text-xl text-primary' />
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
                <Icon className="text-base" />
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
            <i className="bx bx-brain text-sm" />
            AI tracks your project progress automatically
          </p>
        </div>
      </CardContent>
    </GlassCard>
  )
}
