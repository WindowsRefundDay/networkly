"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { CardContent } from "@/components/ui/card"


interface AnalyticsSummaryProps {
  statsData: {
    profileViews: { value: number; change: string; trend: string }
    searchAppearances: { value: number; change: string; trend: string }
    connections: { value: number; change: string; trend: string }
    applications: { value: number; change: string; trend: string }
    projects: { value: number; change: string; trend: string }
  }
}

export function AnalyticsSummary({ statsData }: AnalyticsSummaryProps) {
  const metrics = [
    {
      label: "Profile Views",
      value: statsData.profileViews.value.toString(),
      change: statsData.profileViews.change,
      trend: statsData.profileViews.trend,
      iconClass: "bx bx-show",
      color: "text-primary bg-primary/10",
    },
    {
      label: "Search Appearances",
      value: statsData.searchAppearances.value.toString(),
      change: statsData.searchAppearances.change,
      trend: statsData.searchAppearances.trend,
      iconClass: "bx bx-search-alt",
      color: "text-primary bg-primary/10",
    },
    {
      label: "Network Connections",
      value: statsData.connections.value.toString(),
      change: statsData.connections.change,
      trend: statsData.connections.trend,
      iconClass: "bx bx-group",
      color: "text-primary bg-primary/10",
    },
    {
      label: "Applications Sent",
      value: statsData.applications.value.toString(),
      change: statsData.applications.change,
      trend: statsData.applications.trend,
      iconClass: "bx bx-briefcase",
      color: "text-primary bg-primary/10",
    },
    {
      label: "Projects Completed",
      value: statsData.projects.value.toString(),
      change: statsData.projects.change,
      trend: statsData.projects.trend,
      iconClass: "bx bx-check-circle",
      color: "text-primary bg-primary/10",
    },
    {
      label: "AI Match Rate",
      value: "92%",
      change: "+5%",
      trend: "up",
      iconClass: "bx bx-brain",
      color: "text-primary bg-primary/10",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <GlassCard key={metric.label} className="border-border">
          <CardContent className="pt-6 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 flex items-center justify-center ${metric.color}`}>
                <i className={`${metric.iconClass} text-xl`} />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
              <div
                className={`flex items-center gap-0.5 text-xs font-medium ${metric.trend === "up" ? "text-secondary" : "text-destructive"}`}
              >
                <i className={`bx ${metric.trend === "up" ? "bx-trending-up" : "bx-trending-down"} text-sm`} />
                {metric.change}
              </div>
            </div>
          </CardContent>
        </GlassCard>
      ))}
    </div>
  )
}
