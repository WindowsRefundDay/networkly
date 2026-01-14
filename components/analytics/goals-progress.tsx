"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Target, CheckCircle2, Circle, Loader2 } from "lucide-react"
import { getRoadmapProgress } from "@/app/actions/goals"

export function GoalsProgress() {
  const [goalData, setGoalData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGoalProgress() {
      try {
        const data = await getRoadmapProgress()
        setGoalData(data)
      } catch (error) {
        console.error("Failed to fetch goal progress:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchGoalProgress()
  }, [])

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Target className="h-5 w-5 text-primary" />
            Goals Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!goalData) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Target className="h-5 w-5 text-primary" />
            Goals Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Set a career goal to track your progress!
          </p>
        </CardContent>
      </Card>
    )
  }

  const roadmap = Array.isArray(goalData.roadmap) ? goalData.roadmap : []

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Target className="h-5 w-5 text-primary" />
          Goals Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
            <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground text-sm">{goalData.goalText}</h4>
            <span className="text-sm font-semibold text-primary">{goalData.progress}%</span>
            </div>
          <Progress value={goalData.progress} className="h-2" />
          <div className="grid grid-cols-1 gap-2 mt-4">
            {roadmap.slice(0, 4).map((step: any, index: number) => {
              const isCompleted = goalData.progress >= (index + 1) * 25
              return (
                <div key={index} className="flex items-start gap-2 text-xs">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  )}
                  <span className={isCompleted ? "text-muted-foreground line-through" : "text-foreground"}>
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
