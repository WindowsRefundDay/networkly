"use client"

import { useState, useTransition, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { addAchievement, updateAchievement } from "@/app/actions/profile-items"
import { toast } from "sonner"

interface Achievement {
  id: string
  title: string
  category?: string
  description?: string | null
  date: string
  icon: string
}

interface AddAchievementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  achievement?: Achievement | null
}

const ACHIEVEMENT_CATEGORIES = [
  { value: "Academic", label: "Academic" },
  { value: "Athletic", label: "Athletic" },
  { value: "Service", label: "Community Service" },
  { value: "Arts", label: "Arts & Creative" },
  { value: "Other", label: "Other" },
]

const ACHIEVEMENT_ICONS = [
  { value: "trophy", label: "🏆 Trophy" },
  { value: "award", label: "🏅 Award" },
  { value: "star", label: "⭐ Star" },
]

export function AddAchievementDialog({ 
  open, 
  onOpenChange, 
  achievement 
}: AddAchievementDialogProps) {
  const isEditing = !!achievement
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("Academic")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [icon, setIcon] = useState("trophy")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (achievement) {
      setTitle(achievement.title || "")
      setCategory(achievement.category || "Academic")
      setDescription(achievement.description || "")
      setDate(achievement.date || "")
      setIcon(achievement.icon || "trophy")
    } else {
      resetForm()
    }
  }, [achievement, open])

  const resetForm = () => {
    setTitle("")
    setCategory("Academic")
    setDescription("")
    setDate("")
    setIcon("trophy")
  }

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Please enter an achievement title")
      return
    }
    if (!date.trim()) {
      toast.error("Please select a date")
      return
    }

    startTransition(async () => {
      try {
        const data = {
          title: title.trim(),
          category: category as "Academic" | "Athletic" | "Service" | "Arts" | "Other",
          description: description.trim() || undefined,
          date: date.trim(),
          icon: icon as "trophy" | "award" | "star",
        }

        if (isEditing && achievement) {
          await updateAchievement(achievement.id, data)
          toast.success("Achievement updated")
        } else {
          await addAchievement(data)
          toast.success("Achievement added")
        }
        onOpenChange(false)
        resetForm()
      } catch (error) {
        toast.error(isEditing ? "Failed to update achievement" : "Failed to add achievement")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Achievement" : "Add Achievement"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update your achievement details."
              : "Record an accomplishment to showcase your success."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Title *</Label>
              <span className="text-xs text-muted-foreground">{title.length}/50</span>
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 50))}
              placeholder="e.g., Dean's List, 1st Place Science Fair"
              maxLength={50}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ACHIEVEMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Brief Description</Label>
              <span className="text-xs text-muted-foreground">{description.length}/150</span>
            </div>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 150))}
              placeholder="What did you accomplish? (optional)"
              maxLength={150}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue placeholder="Select an icon" />
              </SelectTrigger>
              <SelectContent>
                {ACHIEVEMENT_ICONS.map((ic) => (
                  <SelectItem key={ic.value} value={ic.value}>
                    {ic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Updating..." : "Adding..."}
              </>
            ) : (
              isEditing ? "Update" : "Add Achievement"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
