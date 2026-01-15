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
import { addProfileGoal, updateProfileGoal, type ProfileGoalStatus } from "@/app/actions/goals"
import { toast } from "sonner"

interface ProfileGoal {
  id: string
  title: string
  targetDate: string
  status: ProfileGoalStatus
}

interface AddGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: ProfileGoal | null
}

const GOAL_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
]

export function AddGoalDialog({ 
  open, 
  onOpenChange, 
  goal 
}: AddGoalDialogProps) {
  const isEditing = !!goal
  const [title, setTitle] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [status, setStatus] = useState<ProfileGoalStatus>("pending")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (goal) {
      setTitle(goal.title || "")
      setTargetDate(goal.targetDate || "")
      setStatus(goal.status || "pending")
    } else {
      resetForm()
    }
  }, [goal, open])

  const resetForm = () => {
    setTitle("")
    setTargetDate("")
    setStatus("pending")
  }

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Please enter a goal title")
      return
    }
    if (!targetDate) {
      toast.error("Please select a target date")
      return
    }

    startTransition(async () => {
      try {
        if (isEditing && goal) {
          await updateProfileGoal(goal.id, {
            title: title.trim(),
            targetDate,
            status,
          })
          toast.success("Goal updated")
        } else {
          await addProfileGoal({
            title: title.trim(),
            targetDate,
            status,
          })
          toast.success("Goal added")
        }
        onOpenChange(false)
        resetForm()
      } catch (error) {
        toast.error(isEditing ? "Failed to update goal" : "Failed to add goal")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Goal" : "Add Goal"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update your goal details."
              : "Set a new goal to track your progress."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="goal-title">Goal Title *</Label>
              <span className="text-xs text-muted-foreground">{title.length}/100</span>
            </div>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              placeholder="e.g., Complete AP Chemistry course"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target-date">Target Date *</Label>
              <Input
                id="target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProfileGoalStatus)}>
                <SelectTrigger id="goal-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              isEditing ? "Update" : "Add Goal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
