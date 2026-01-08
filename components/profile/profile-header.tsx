"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, GraduationCap, Pencil, Share2, MessageCircle, Sparkles, CheckCircle2 } from "lucide-react"
import { useUser } from "@clerk/nextjs"

interface ProfileHeaderProps {
  user?: {
    name: string
    avatar?: string | null
    headline?: string | null
    location?: string | null
    university?: string | null
    graduationYear?: string | null
    connections: number
    profileViews: number
  }
}

export function ProfileHeader({ user: dbUser }: ProfileHeaderProps) {
  const { user: clerkUser } = useUser()

  // Use database user if provided, otherwise fallback to Clerk user
  const userName = dbUser?.name || clerkUser?.fullName || clerkUser?.firstName || "User"
  const userAvatar = dbUser?.avatar || clerkUser?.imageUrl || "/placeholder.svg"
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase()
  const headline = dbUser?.headline || "Professional"
  const location = dbUser?.location || ""
  const university = dbUser?.university || ""
  const graduationYear = dbUser?.graduationYear || ""
  const connections = dbUser?.connections || 0
  const profileViews = dbUser?.profileViews || 0

  return (
    <Card className="border-border overflow-hidden">
      <div className="h-32 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/10" />
      <CardContent className="relative pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
          <Avatar className="h-32 w-32 border-4 border-card">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className="text-3xl">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 sm:pb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{userName}</h1>
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <p className="text-muted-foreground">{headline}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {location}
                </span>
              )}
              {university && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  {university}{graduationYear ? ` · ${graduationYear}` : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-primary font-medium">{connections} connections</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{profileViews} profile views</span>
            </div>
          </div>
          <div className="flex gap-2 sm:pb-2">
            <Button size="sm" className="gap-1">
              <Sparkles className="h-4 w-4" />
              AI Enhance
            </Button>
            <Button size="sm" variant="outline" className="gap-1 bg-transparent">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button size="sm" variant="outline" className="gap-1 bg-transparent">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="gap-1 bg-transparent">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

