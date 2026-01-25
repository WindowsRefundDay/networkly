"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateUserProfileDetails } from "@/app/actions/user"
import {
  GRADE_LEVEL_OPTIONS,
  AVAILABILITY_OPTIONS,
  OPPORTUNITY_TYPE_OPTIONS,
  ACADEMIC_STRENGTH_OPTIONS,
} from "@/lib/profile-options"

interface EditProfileDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

export function EditProfileDetailsDialog({
  open,
  onOpenChange,
  userProfile,
}: EditProfileDetailsDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [school, setSchool] = useState(userProfile?.school || "")
  const [gradeLevel, setGradeLevel] = useState<string>(
    userProfile?.grade_level?.toString() || ""
  )
  const [location, setLocation] = useState(userProfile?.location || "")
  const [careerGoals, setCareerGoals] = useState(userProfile?.career_goals || "")
  const [availability, setAvailability] = useState(userProfile?.availability || "")
  const [interests, setInterests] = useState(
    (userProfile?.interests || []).join(", ")
  )
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>(
    userProfile?.academic_strengths || []
  )
  const [selectedOpportunityTypes, setSelectedOpportunityTypes] = useState<string[]>(
    userProfile?.preferred_opportunity_types || []
  )

  const handleStrengthToggle = (strength: string) => {
    setSelectedStrengths((prev) =>
      prev.includes(strength)
        ? prev.filter((s) => s !== strength)
        : [...prev, strength]
    )
  }

  const handleOpportunityTypeToggle = (type: string) => {
    setSelectedOpportunityTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const interestsArray = interests
          .split(",")
          .map((i) => i.trim())
          .filter((i) => i.length > 0)

        await updateUserProfileDetails({
          school: school || null,
          grade_level: gradeLevel ? parseInt(gradeLevel, 10) : null,
          location: location || null,
          career_goals: careerGoals || null,
          availability: availability || null,
          interests: interestsArray,
          academic_strengths: selectedStrengths,
          preferred_opportunity_types: selectedOpportunityTypes,
        })

        toast.success("Profile details updated!")
        onOpenChange(false)
        router.refresh()
      } catch (error) {
        console.error("Failed to update profile:", error)
        toast.error("Failed to update profile details")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile Details</DialogTitle>
          <DialogDescription>
            Update your profile information to get personalized opportunity
            recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* School */}
          <div className="space-y-2">
            <Label htmlFor="school">School</Label>
            <Input
              id="school"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="Enter your school name"
              maxLength={100}
            />
          </div>

          {/* Grade Level */}
          <div className="space-y-2">
            <Label htmlFor="grade-level">Grade Level</Label>
            <Select value={gradeLevel} onValueChange={setGradeLevel}>
              <SelectTrigger id="grade-level">
                <SelectValue placeholder="Select grade level" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_LEVEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              maxLength={100}
            />
          </div>

          {/* Career Goals */}
          <div className="space-y-2">
            <Label htmlFor="career-goals">Career Goals</Label>
            <Textarea
              id="career-goals"
              value={careerGoals}
              onChange={(e) => setCareerGoals(e.target.value)}
              placeholder="What are your career aspirations?"
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {careerGoals.length}/500 characters
            </p>
          </div>

          {/* Availability */}
          <div className="space-y-2">
            <Label htmlFor="availability">Availability</Label>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger id="availability">
                <SelectValue placeholder="Select availability" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interests */}
          <div className="space-y-2">
            <Label htmlFor="interests">Interests</Label>
            <Textarea
              id="interests"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="AI/ML, Web Development, Research (comma-separated)"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Separate interests with commas
            </p>
          </div>

          {/* Academic Strengths */}
          <div className="space-y-3">
            <Label>Academic Strengths</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACADEMIC_STRENGTH_OPTIONS.map((strength) => (
                <div key={strength} className="flex items-center space-x-2">
                  <Checkbox
                    id={`strength-${strength}`}
                    checked={selectedStrengths.includes(strength)}
                    onCheckedChange={() => handleStrengthToggle(strength)}
                  />
                  <label
                    htmlFor={`strength-${strength}`}
                    className="text-sm cursor-pointer"
                  >
                    {strength}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Preferred Opportunity Types */}
          <div className="space-y-3">
            <Label>Preferred Opportunity Types</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OPPORTUNITY_TYPE_OPTIONS.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={selectedOpportunityTypes.includes(type)}
                    onCheckedChange={() => handleOpportunityTypeToggle(type)}
                  />
                  <label
                    htmlFor={`type-${type}`}
                    className="text-sm cursor-pointer"
                  >
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
