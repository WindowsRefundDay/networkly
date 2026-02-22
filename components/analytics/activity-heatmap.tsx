"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { getActivityHeatmap } from "@/app/actions/activity"

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const activityColors = ["bg-muted", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary"]

// Map activity count to color level (0-4)
function getColorLevel(count: number): number {
  if (count === 0) return 0
  if (count <= 2) return 1
  if (count <= 4) return 2
  if (count <= 7) return 3
  return 4
}

export function ActivityHeatmap() {
  const [heatmapData, setHeatmapData] = useState<Array<{ date: string; count: number; dayOfWeek: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getActivityHeatmap(12)
        setHeatmapData(data)
      } catch (error) {
        console.error("Failed to fetch activity heatmap:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <GlassCard className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Activity</CardTitle>
          <p className="text-sm text-muted-foreground">Your networking activity over the past 12 weeks</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </GlassCard>
    )
  }

  // Group data by week (7 days each)
  const weeks: Array<Array<{ date: string; count: number; dayOfWeek: number }>> = []
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7))
  }

  return (
    <GlassCard className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Activity</CardTitle>
        <p className="text-sm text-muted-foreground">Your networking activity over the past 12 weeks</p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground pr-2">
            {dayNames.map((day) => (
              <div key={day} className="h-3 flex items-center">
                {day}
              </div>
            ))}
          </div>
          <div className="flex gap-1 flex-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1 flex-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`h-3 rounded-sm ${activityColors[getColorLevel(day.count)]}`}
                    title={`${day.date}: ${day.count} ${day.count === 1 ? "activity" : "activities"}`}
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
    </GlassCard>
  )
}
