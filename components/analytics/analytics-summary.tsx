"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, Eye, Search, Briefcase, Target, Sparkles } from "lucide-react"

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
      icon: Eye,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Search Appearances",
      value: statsData.searchAppearances.value.toString(),
      change: statsData.searchAppearances.change,
      trend: statsData.searchAppearances.trend,
      icon: Search,
      color: "text-secondary bg-secondary/10",
    },
    {
      label: "Network Connections",
      value: statsData.connections.value.toString(),
      change: statsData.connections.change,
      trend: statsData.connections.trend,
      icon: Users,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      label: "Applications Sent",
      value: statsData.applications.value.toString(),
      change: statsData.applications.change,
      trend: statsData.applications.trend,
      icon: Briefcase,
      color: "text-rose-500 bg-rose-500/10",
    },
    {
      label: "Projects Completed",
      value: statsData.projects.value.toString(),
      change: statsData.projects.change,
      trend: statsData.projects.trend,
      icon: Target,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: "AI Match Rate",
      value: "92%",
      change: "+5%",
      trend: "up",
      icon: Sparkles,
      color: "text-violet-500 bg-violet-500/10",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${metric.color}`}>
                <metric.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
              <div
                className={`flex items-center gap-0.5 text-xs font-medium ${metric.trend === "up" ? "text-secondary" : "text-destructive"}`}
              >
                {metric.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {metric.change}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
