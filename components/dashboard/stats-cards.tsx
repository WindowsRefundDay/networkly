import { Card, CardContent } from "@/components/ui/card"
import { Users, Eye, Search, FolderKanban } from "lucide-react"
import { currentUser } from "@/lib/mock-data"

const stats = [
  {
    title: "Connections",
    value: currentUser.connections,
    change: "+12%",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Profile Views",
    value: currentUser.profileViews,
    change: "+8%",
    icon: Eye,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    title: "Search Appearances",
    value: currentUser.searchAppearances,
    change: "+15%",
    icon: Search,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Projects",
    value: currentUser.completedProjects,
    change: "+2 new",
    icon: FolderKanban,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
]

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-border">
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
        </Card>
      ))}
    </div>
  )
}
