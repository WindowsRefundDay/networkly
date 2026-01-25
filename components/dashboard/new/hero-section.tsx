"use client"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

interface HeroSectionProps {
  user: {
    name: string
    headline?: string | null
    profileCompleteness: number
  }
  dailyDigest: {
    unreadMessages: number
    newOpportunities: number
    pendingConnections: number
  }
}

export function HeroSection({ user, dailyDigest }: HeroSectionProps) {
  const firstName = user.name.split(" ")[0]
  
  return (
    <div className="relative overflow-hidden h-full flex flex-col justify-between p-6 bg-gradient-to-br from-primary/10 via-background to-background">
      {/* Abstract background decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-1">
              Good morning, <span className="text-primary">{firstName}</span>
            </h2>
            <p className="text-muted-foreground line-clamp-1">
              {user.headline || "Ready to explore new opportunities?"}
            </p>
          </div>
          <div className="hidden md:block">
            <Button size="sm" variant="outline" className="rounded-full gap-2">
              <i className="bx bx-user text-sm" />
              Edit Profile
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Profile Completeness</span>
              <span className="text-primary font-bold">{user.profileCompleteness}%</span>
            </div>
            <Progress value={user.profileCompleteness} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {user.profileCompleteness < 100 
                ? "Add your recent projects to reach 100%" 
                : "Your profile is looking great!"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-border/50 text-center hover:bg-background transition-colors">
              <div className="text-2xl font-bold text-primary">{dailyDigest.newOpportunities}</div>
              <div className="text-xs text-muted-foreground font-medium">New Matches</div>
            </div>
            <div className="bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-border/50 text-center hover:bg-background transition-colors">
              <div className="text-2xl font-bold text-primary">{dailyDigest.unreadMessages}</div>
              <div className="text-xs text-muted-foreground font-medium">Messages</div>
            </div>
            <div className="bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-border/50 text-center hover:bg-background transition-colors">
              <div className="text-2xl font-bold text-primary">{dailyDigest.pendingConnections}</div>
              <div className="text-xs text-muted-foreground font-medium">Requests</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <i className="bx bx-bulb text-base text-primary" />
          <span>Daily Tip: Update your skills regularly</span>
        </div>
        <Link href="/profile" className="text-xs font-medium text-primary flex items-center gap-1 hover:underline">
          View Profile <i className="bx bx-right-arrow-alt text-sm" />
        </Link>
      </div>
    </div>
  )
}
