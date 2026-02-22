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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { updateBio } from "@/app/actions/profile-items"
import { toast } from "sonner"

interface EditAboutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBio: string | null
}

export function EditAboutDialog({ open, onOpenChange, currentBio }: EditAboutDialogProps) {
  const [bio, setBio] = useState(currentBio || "")
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateBio(bio)
        toast.success("Bio updated successfully")
        onOpenChange(false)
      } catch (error) {
        toast.error("Failed to update bio")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit About</DialogTitle>
          <DialogDescription>
            Write a brief description about yourself. This helps others learn about you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself, your interests, and what you're working on..."
              rows={6}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/5000 characters
            </p>
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
