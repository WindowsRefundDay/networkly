"use client"

import { Clock, Briefcase, UserPlus, FileText, CheckCircle2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ActivityItem {
  id: string
  type: string
  metadata?: any
  date: Date
}

interface ActivityFeedProps {
  activities?: ActivityItem[]
}

export function ActivityFeed({ activities = [] }: ActivityFeedProps) {
  const hasActivities = activities && activities.length > 0

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
      </div>
      
      <ScrollArea className="flex-1 pr-4">
        {!hasActivities ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Clock className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground font-medium">No recent activity</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Start exploring opportunities and connecting with others
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-4 group">
                <div className="relative flex flex-col items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-background
                    ${activity.type === 'application' ? 'bg-blue-500/20 text-blue-500' : ''}
                    ${activity.type === 'connection' ? 'bg-emerald-500/20 text-emerald-500' : ''}
                    ${activity.type === 'profile' ? 'bg-amber-500/20 text-amber-500' : ''}
                    ${activity.type === 'opportunity' ? 'bg-purple-500/20 text-purple-500' : ''}
                  `}>
                    {activity.type === 'application' && <Briefcase className="w-4 h-4" />}
                    {activity.type === 'connection' && <UserPlus className="w-4 h-4" />}
                    {activity.type === 'profile' && <FileText className="w-4 h-4" />}
                    {activity.type === 'opportunity' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="w-0.5 grow bg-border group-last:hidden mt-2" />
                </div>
                
                <div className="pb-6">
                  <p className="text-sm font-medium text-foreground">
                    {getActivityTitle(activity)}
                  </p>
                  {activity.metadata?.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.metadata.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-2 font-medium uppercase tracking-wider">
                    {formatTimeAgo(activity.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function getActivityTitle(activity: ActivityItem): string {
  if (activity.metadata?.title) {
    return activity.metadata.title
  }

  switch (activity.type) {
    case 'application':
      return 'Applied to opportunity'
    case 'connection':
      return 'New connection'
    case 'profile':
      return 'Updated profile'
    case 'opportunity':
      return 'Saved opportunity'
    default:
      return 'Activity recorded'
  }
}

function formatTimeAgo(date: Date) {
  const diff = (new Date().getTime() - new Date(date).getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
