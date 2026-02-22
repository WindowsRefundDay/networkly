"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Target, 
  GraduationCap, 
  Calendar, 
  Sparkles, 
  BookOpen, 
  Pencil,
  MapPin
} from "lucide-react"
import { EditProfileDetailsDialog } from "./edit-profile-details-dialog"

interface ProfileDetailsProps {
  userProfile: {
    id?: string
    user_id?: string
    school?: string | null
    grade_level?: number | null
    interests?: string[]
    location?: string | null
    career_goals?: string | null
    preferred_opportunity_types?: string[]
    academic_strengths?: string[]
    availability?: string | null
  } | null
}

function getGradeLevelLabel(level: number): string {
  const labels: Record<number, string> = {
    9: "9th Grade (Freshman)",
    10: "10th Grade (Sophomore)",
    11: "11th Grade (Junior)",
    12: "12th Grade (Senior)",
  }
  return labels[level] || `Grade ${level}`
}

export function ProfileDetailsSection({ userProfile }: ProfileDetailsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)

  const hasData = userProfile && (
    userProfile.career_goals ||
    (userProfile.interests && userProfile.interests.length > 0) ||
    (userProfile.academic_strengths && userProfile.academic_strengths.length > 0) ||
    (userProfile.preferred_opportunity_types && userProfile.preferred_opportunity_types.length > 0) ||
    userProfile.availability ||
    userProfile.school ||
    userProfile.grade_level ||
    userProfile.location
  )

  return (
    <>
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Target className="h-5 w-5 text-primary" />
            Profile Details
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasData ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Add your profile details to get personalized opportunity recommendations.
              </p>
              <Button onClick={() => setIsEditOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Add Profile Details
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Career Goals */}
              {userProfile?.career_goals && (
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Career Goals
                  </div>
                  <p className="text-foreground">{userProfile.career_goals}</p>
                </div>
              )}

              {/* School & Grade */}
              {(userProfile?.school || userProfile?.grade_level) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    Education
                  </div>
                  <div className="text-foreground">
                    {userProfile.school && <p>{userProfile.school}</p>}
                    {userProfile.grade_level && (
                      <p className="text-sm text-muted-foreground">
                        {getGradeLevelLabel(userProfile.grade_level)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Location */}
              {userProfile?.location && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Location
                  </div>
                  <p className="text-foreground">{userProfile.location}</p>
                </div>
              )}

              {/* Availability */}
              {userProfile?.availability && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Availability
                  </div>
                  <Badge variant="secondary">{userProfile.availability}</Badge>
                </div>
              )}

              {/* Interests */}
              {userProfile?.interests && userProfile.interests.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Interests
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.interests.map((interest, i) => (
                      <Badge key={i} variant="outline">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Academic Strengths */}
              {userProfile?.academic_strengths && userProfile.academic_strengths.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    Academic Strengths
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.academic_strengths.map((strength, i) => (
                      <Badge key={i} variant="secondary">
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Preferred Opportunity Types */}
              {userProfile?.preferred_opportunity_types && userProfile.preferred_opportunity_types.length > 0 && (
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Preferred Opportunities
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.preferred_opportunity_types.map((type, i) => (
                      <Badge key={i} className="bg-primary/10 text-primary hover:bg-primary/20">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <EditProfileDetailsDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        userProfile={userProfile}
      />
    </>
  )
}
