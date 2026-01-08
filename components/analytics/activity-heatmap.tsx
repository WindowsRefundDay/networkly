"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const weeks = Array.from({ length: 12 }, (_, i) => i)

function getActivityLevel(): number {
  return Math.floor(Math.random() * 5)
}

const activityColors = ["bg-muted", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary"]

export function ActivityHeatmap() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Activity</CardTitle>
        <p className="text-sm text-muted-foreground">Your networking activity over the past 12 weeks</p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground pr-2">
            {days.map((day) => (
              <div key={day} className="h-3 flex items-center">
                {day}
              </div>
            ))}
          </div>
          <div className="flex gap-1 flex-1">
            {weeks.map((week) => (
              <div key={week} className="flex flex-col gap-1 flex-1">
                {days.map((day) => (
                  <div
                    key={`${week}-${day}`}
                    className={`h-3 rounded-sm ${activityColors[getActivityLevel()]}`}
                    title={`Week ${week + 1}, ${day}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          {activityColors.map((color, i) => (
            <div key={i} className={`h-3 w-3 rounded-sm ${color}`} />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  )
}
