"use client"

import { useState, useTransition } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, GraduationCap, Pencil, Share2, MessageCircle, CheckCircle2, X, Loader2, Check } from "lucide-react"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import { useRouter } from "next/navigation"
import { ShareProfileDialog } from "./dialogs"
import { updateProfile } from "@/app/actions/profile"
import { toast } from "sonner"
import Image from "next/image"

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
    linkedinUrl?: string | null
    githubUrl?: string | null
    portfolioUrl?: string | null
  }
  userProfile?: {
    school?: string | null
    grade_level?: number | null
  } | null
}

const GRADE_LEVELS = [
  { value: "9", label: "9th Grade (Freshman)" },
  { value: "10", label: "10th Grade (Sophomore)" },
  { value: "11", label: "11th Grade (Junior)" },
  { value: "12", label: "12th Grade (Senior)" },
]

export function ProfileHeader({ user: dbUser, userProfile }: ProfileHeaderProps) {
  const { user } = useSupabaseUser()
  const router = useRouter()
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Editable fields state
  const [editName, setEditName] = useState(dbUser?.name || "")
  const [editSchool, setEditSchool] = useState(userProfile?.school || "")
  const [editGradeLevel, setEditGradeLevel] = useState(
    userProfile?.grade_level?.toString() || ""
  )

  // Use database user if provided, otherwise fallback to auth user metadata
  const userName =
    dbUser?.name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "User"
  const userAvatar =
    dbUser?.avatar ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    "/placeholder.svg"
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase()
  const headline = dbUser?.headline || "High School Student"
  const location = dbUser?.location || ""
  const university = dbUser?.university || userProfile?.school || ""
  const graduationYear = dbUser?.graduationYear || ""
  const connections = dbUser?.connections || 0
  const profileViews = dbUser?.profileViews || 0
  const gradeLevel = userProfile?.grade_level

  const handleEdit = () => {
    setEditName(dbUser?.name || "")
    setEditSchool(userProfile?.school || "")
    setEditGradeLevel(userProfile?.grade_level?.toString() || "")
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateProfile({
          name: editName.trim() || undefined,
          university: editSchool.trim() || undefined,
          graduationYear: editGradeLevel ? parseInt(editGradeLevel, 10) + 2024 - 9 : undefined,
        })
        toast.success("Profile updated")
        setIsEditing(false)
        router.refresh()
      } catch (error) {
        toast.error("Failed to update profile")
      }
    })
  }

  const handleMessage = () => {
    router.push("/network?tab=messages")
  }

  const getGradeLevelDisplay = () => {
    if (!gradeLevel) return null
    const grade = GRADE_LEVELS.find(g => g.value === gradeLevel.toString())
    return grade?.label.split(" ")[0] + " " + grade?.label.split(" ")[1] || `Grade ${gradeLevel}`
  }

  return (
    <>
      <Card className="border-border overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/10" />
        <CardContent className="relative pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
            <Avatar className="h-32 w-32 border-4 border-card">
              {userAvatar && userAvatar !== "/placeholder.svg" ? (
                <Image
                  src={userAvatar}
                  alt={userName}
                  width={128}
                  height={128}
                  className="rounded-full object-cover"
                  priority
                />
              ) : (
                <AvatarFallback className="text-3xl">{userInitials}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 sm:pb-2">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your name"
                      className="max-w-xs"
                      maxLength={100}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="edit-grade" className="text-xs text-muted-foreground">Grade Level</Label>
                      <Select value={editGradeLevel} onValueChange={setEditGradeLevel}>
                        <SelectTrigger id="edit-grade">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_LEVELS.map((grade) => (
                            <SelectItem key={grade.value} value={grade.value}>
                              {grade.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-school" className="text-xs text-muted-foreground">School</Label>
                      <Input
                        id="edit-school"
                        value={editSchool}
                        onChange={(e) => setEditSchool(e.target.value)}
                        placeholder="Your school"
                        maxLength={100}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
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
                    {(university || userProfile?.school) && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        {university || userProfile?.school}
                        {gradeLevel ? ` · ${getGradeLevelDisplay()}` : graduationYear ? ` · ${graduationYear}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-primary font-medium">{connections} connections</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{profileViews} profile views</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 sm:pb-2">
              {isEditing ? (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-1 bg-transparent"
                    onClick={handleCancel}
                    disabled={isPending}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    className="gap-1"
                    onClick={handleSave}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-1 bg-transparent"
                    onClick={handleEdit}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-1 bg-transparent"
                    onClick={() => setShareDialogOpen(true)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-1 bg-transparent"
                    onClick={handleMessage}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ShareProfileDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        userName={userName}
      />
    </>
  )
}
