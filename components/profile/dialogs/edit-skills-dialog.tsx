"use client"

import { useState, useTransition } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Plus } from "lucide-react"
import { addSkill, removeSkill, addInterest, removeInterest } from "@/app/actions/profile-items"
import { toast } from "sonner"

interface EditSkillsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentSkills: string[]
  currentInterests: string[]
}

export function EditSkillsDialog({ 
  open, 
  onOpenChange, 
  currentSkills, 
  currentInterests 
}: EditSkillsDialogProps) {
  const [skills, setSkills] = useState<string[]>(currentSkills)
  const [interests, setInterests] = useState<string[]>(currentInterests)
  const [newSkill, setNewSkill] = useState("")
  const [newInterest, setNewInterest] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleAddSkill = () => {
    if (!newSkill.trim()) return
    if (skills.includes(newSkill.trim())) {
      toast.error("Skill already exists")
      return
    }
    
    startTransition(async () => {
      try {
        await addSkill(newSkill.trim())
        setSkills([...skills, newSkill.trim()])
        setNewSkill("")
        toast.success("Skill added")
      } catch (error) {
        toast.error("Failed to add skill")
      }
    })
  }

  const handleRemoveSkill = (skill: string) => {
    startTransition(async () => {
      try {
        await removeSkill(skill)
        setSkills(skills.filter((s) => s !== skill))
        toast.success("Skill removed")
      } catch (error) {
        toast.error("Failed to remove skill")
      }
    })
  }

  const handleAddInterest = () => {
    if (!newInterest.trim()) return
    if (interests.includes(newInterest.trim())) {
      toast.error("Interest already exists")
      return
    }
    
    startTransition(async () => {
      try {
        await addInterest(newInterest.trim())
        setInterests([...interests, newInterest.trim()])
        setNewInterest("")
        toast.success("Interest added")
      } catch (error) {
        toast.error("Failed to add interest")
      }
    })
  }

  const handleRemoveInterest = (interest: string) => {
    startTransition(async () => {
      try {
        await removeInterest(interest)
        setInterests(interests.filter((i) => i !== interest))
        toast.success("Interest removed")
      } catch (error) {
        toast.error("Failed to remove interest")
      }
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent, type: "skill" | "interest") => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (type === "skill") handleAddSkill()
      else handleAddInterest()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Skills & Interests</DialogTitle>
          <DialogDescription>
            Add or remove skills and interests to help others find you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Skills Section */}
          <div className="space-y-3">
            <Label>Skills</Label>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, "skill")}
                placeholder="Add a skill..."
                maxLength={50}
                disabled={isPending}
              />
              <Button 
                onClick={handleAddSkill} 
                disabled={isPending || !newSkill.trim()}
                size="icon"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="pr-1 gap-1"
                >
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    disabled={isPending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {skills.length === 0 && (
                <p className="text-sm text-muted-foreground">No skills added yet</p>
              )}
            </div>
          </div>

          {/* Interests Section */}
          <div className="space-y-3">
            <Label>Interests</Label>
            <div className="flex gap-2">
              <Input
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, "interest")}
                placeholder="Add an interest..."
                maxLength={50}
                disabled={isPending}
              />
              <Button 
                onClick={handleAddInterest} 
                disabled={isPending || !newInterest.trim()}
                size="icon"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Badge
                  key={interest}
                  variant="outline"
                  className="pr-1 gap-1"
                >
                  {interest}
                  <button
                    onClick={() => handleRemoveInterest(interest)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    disabled={isPending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {interests.length === 0 && (
                <p className="text-sm text-muted-foreground">No interests added yet</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
