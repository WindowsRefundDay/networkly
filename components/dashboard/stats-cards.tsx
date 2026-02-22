import { GlassCard } from "@/components/ui/glass-card"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Eye, Search, FolderKanban } from "lucide-react"

interface User {
  connections: number
  profileViews: number
  searchAppearances: number
  completedProjects: number
}

interface StatsCardsProps {
  statsData: {
    connections: { value: number; change: string }
    profileViews: { value: number; change: string }
    searchAppearances: { value: number; change: string }
    projects: { value: number; change: string }
  }
}

export function StatsCards({ statsData }: StatsCardsProps) {
  const statsArr = [
    {
      title: "Connections",
      value: statsData.connections.value,
      change: statsData.connections.change,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Profile Views",
      value: statsData.profileViews.value,
      change: statsData.profileViews.change,
      icon: Eye,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Search Appearances",
      value: statsData.searchAppearances.value,
      change: statsData.searchAppearances.change,
      icon: Search,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Projects",
      value: statsData.projects.value,
      change: statsData.projects.change,
      icon: FolderKanban,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
    },
  ]


  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsArr.map((stat) => (
        <GlassCard key={stat.title} className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{stat.value.toLocaleString()}</p>
                <p className="mt-1 text-xs text-secondary">{stat.change} this month</p>
              </div>
              <div className={`rounded-full p-3 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </GlassCard>
      ))}
    </div>
  )
}

