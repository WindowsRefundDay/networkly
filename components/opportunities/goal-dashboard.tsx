"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Target, ChevronRight, Plus, Loader2 } from "lucide-react"
import { getGoal, getRoadmapProgress } from "@/app/actions/goals"

interface Goal {
  id: string
  goalText: string
  roadmap: any[]
}

export function GoalDashboard() {
  const [goal, setGoal] = useState<Goal | null>(null)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getGoal()
        if (data) {
          setGoal({
            id: data.id,
            goalText: data.goalText,
            roadmap: (data.roadmap as any[]) || [],
          })
          const prog = await getRoadmapProgress()
          if (prog) setProgress(prog.progress)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return null

  if (!goal) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center bg-muted/30">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-sm font-medium mb-1">No Goal Set</h3>
        <p className="text-xs text-muted-foreground mb-3">Set a career goal to get personalized matches.</p>
        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Set Goal
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Current Goal</h3>
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
            {goal.goalText}
          </p>
        </div>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Target className="h-4 w-4 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <Button variant="ghost" className="w-full justify-between h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
        View Roadmap
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  )
}
