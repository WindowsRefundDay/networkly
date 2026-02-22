import type React from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle2, Clock, Send, FileCheck } from "lucide-react"
import { getApplications } from "@/app/actions/applications"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const statusConfig: Record<string, { color: string; icon: React.ElementType; bgColor: string }> = {
  "Interview Scheduled": { color: "text-secondary", icon: CheckCircle2, bgColor: "bg-secondary/10" },
  "Under Review": { color: "text-amber-500", icon: Clock, bgColor: "bg-amber-500/10" },
  Applied: { color: "text-primary", icon: Send, bgColor: "bg-primary/10" },
  Accepted: { color: "text-emerald-500", icon: FileCheck, bgColor: "bg-emerald-500/10" },
}

export async function ApplicationTracker() {
  const applications = await getApplications()

  return (
    <GlassCard className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Application Tracker</CardTitle>
        <Link href="/opportunities">
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {applications.map((app) => {
          const config = statusConfig[app.status] || statusConfig.Applied
          const StatusIcon = config.icon
          return (
            <div key={app.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className={`rounded-full p-2 ${config.bgColor}`}>
                <StatusIcon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground truncate">{app.position}</h4>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {app.company}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{app.nextStep}</p>
              </div>
              <Badge className={`${config.bgColor} ${config.color} border-0 shrink-0`}>{app.status}</Badge>
            </div>
          )
        })}
      </CardContent>
    </GlassCard>
  )
}

