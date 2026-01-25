"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Trophy, Briefcase, GraduationCap } from "lucide-react"
import { format, parseISO } from "date-fns"

interface Achievement {
  id: string
  title: string
  date: string
  icon: string
}

interface Extracurricular {
  id: string
  title: string
  organization: string
  type: string
  startDate: string
  endDate: string
  description: string | null
  logo: string | null
}

interface ProfileTimelineProps {
  achievements: Achievement[]
  extracurriculars: Extracurricular[]
}

type TimelineItem = {
  id: string
  type: 'achievement' | 'extracurricular'
  title: string
  subtitle?: string
  date: Date
  dateLabel: string
  description?: string
  icon?: string
  category?: string
}

export function ProfileTimeline({ achievements, extracurriculars }: ProfileTimelineProps) {
  const items: TimelineItem[] = useMemo(() => {
    const achievementItems: TimelineItem[] = achievements.map(a => ({
      id: `ach-${a.id}`,
      type: 'achievement',
      title: a.title,
      date: new Date(a.date),
      dateLabel: format(new Date(a.date), "MMM yyyy"),
      icon: a.icon,
      category: 'Achievement'
    }))

    const activityItems: TimelineItem[] = extracurriculars.map(e => ({
      id: `ext-${e.id}`,
      type: 'extracurricular',
      title: e.title,
      subtitle: e.organization,
      date: new Date(e.startDate),
      dateLabel: `${format(new Date(e.startDate), "MMM yyyy")} - ${e.endDate === 'Present' ? 'Present' : format(new Date(e.endDate), "MMM yyyy")}`,
      description: e.description || undefined,
      category: e.type
    }))

    return [...achievementItems, ...activityItems].sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [achievements, extracurriculars])

  if (items.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          No timeline activity yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full border-0 shadow-none bg-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Journey
        </CardTitle>
      </CardHeader>
      <CardContent className="relative pl-6 border-l-2 border-muted ml-6 space-y-8">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <span className="absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary ring-4 ring-background" />
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-mono">{item.dateLabel}</span>
                <Badge variant={item.type === 'achievement' ? "default" : "secondary"} className="text-[10px]">
                  {item.category}
                </Badge>
              </div>
              
              <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>
              {item.subtitle && (
                <div className="text-sm font-medium text-foreground/80 flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {item.subtitle}
                </div>
              )}
              
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                  {item.description}
                </p>
              )}

              {item.type === 'achievement' && (
                <div className="flex items-center gap-2 mt-1 text-sm text-amber-500 font-medium">
                  <Trophy className="h-4 w-4" />
                  Achievement Unlocked
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  )
}
