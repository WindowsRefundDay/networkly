"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Target, CheckCircle2, Circle } from "lucide-react"

const goals = [
  {
    id: "1",
    title: "Get a summer internship in AI/ML",
    progress: 65,
    milestones: [
      { label: "Update resume", done: true },
      { label: "Apply to 10 companies", done: true },
      { label: "Complete 3 interviews", done: false },
      { label: "Receive offer", done: false },
    ],
  },
  {
    id: "2",
    title: "Grow network to 1000 connections",
    progress: 85,
    milestones: [
      { label: "Connect with 50 peers", done: true },
      { label: "Reach out to 10 mentors", done: true },
      { label: "Attend 3 networking events", done: true },
      { label: "Hit 1000 connections", done: false },
    ],
  },
]

export function GoalsProgress() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Target className="h-5 w-5 text-primary" />
          Goals Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {goals.map((goal) => (
          <div key={goal.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground text-sm">{goal.title}</h4>
              <span className="text-sm font-semibold text-primary">{goal.progress}%</span>
            </div>
            <Progress value={goal.progress} className="h-2" />
            <div className="grid grid-cols-2 gap-2">
              {goal.milestones.map((milestone) => (
                <div key={milestone.label} className="flex items-center gap-2 text-xs">
                  {milestone.done ? (
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={milestone.done ? "text-muted-foreground line-through" : "text-foreground"}>
                    {milestone.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
