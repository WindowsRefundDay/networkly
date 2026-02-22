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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { addExtracurricular, updateExtracurricular } from "@/app/actions/profile-items"
import { toast } from "sonner"

interface Extracurricular {
  id: string
  title: string
  organization: string
  type: string
  startDate: string
  endDate: string
  description?: string | null
  logo?: string | null
}

interface AddExtracurricularDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  extracurricular?: Extracurricular | null
}

const ACTIVITY_TYPES = [
  { value: "Research", label: "Research" },
  { value: "Leadership", label: "Leadership" },
  { value: "Technical", label: "Technical" },
  { value: "Volunteer", label: "Volunteer" },
  { value: "Other", label: "Other" },
]

export function AddExtracurricularDialog({ 
  open, 
  onOpenChange, 
  extracurricular 
}: AddExtracurricularDialogProps) {
  const isEditing = !!extracurricular
  const [title, setTitle] = useState(extracurricular?.title || "")
  const [organization, setOrganization] = useState(extracurricular?.organization || "")
  const [type, setType] = useState(extracurricular?.type || "Other")
  const [startDate, setStartDate] = useState(extracurricular?.startDate || "")
  const [endDate, setEndDate] = useState(extracurricular?.endDate || "")
  const [description, setDescription] = useState(extracurricular?.description || "")
  const [logo, setLogo] = useState(extracurricular?.logo || "")
  const [isPending, startTransition] = useTransition()

  const resetForm = () => {
    setTitle("")
    setOrganization("")
    setType("Other")
    setStartDate("")
    setEndDate("")
    setDescription("")
    setLogo("")
  }

  const handleSave = () => {
    if (!title.trim() || !organization.trim() || !startDate.trim() || !endDate.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    startTransition(async () => {
      try {
        const data = {
          title: title.trim(),
          organization: organization.trim(),
          type: type as "Research" | "Leadership" | "Technical" | "Volunteer" | "Other",
          startDate: startDate.trim(),
          endDate: endDate.trim(),
          description: description.trim() || undefined,
          logo: logo.trim() || undefined,
        }

        if (isEditing && extracurricular) {
          await updateExtracurricular(extracurricular.id, data)
          toast.success("Activity updated")
        } else {
          await addExtracurricular(data)
          toast.success("Activity added")
        }
        onOpenChange(false)
        resetForm()
      } catch (error) {
        toast.error(isEditing ? "Failed to update activity" : "Failed to add activity")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Activity" : "Add Activity"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update your extracurricular activity details."
              : "Add a new extracurricular activity to your profile."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., President, Research Assistant"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">Organization *</Label>
              <Input
                id="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g., Hackathon Club"
                maxLength={100}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="e.g., Sep 2023"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="e.g., Present"
                maxLength={50}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your role and responsibilities..."
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL (optional)</Label>
            <Input
              id="logo"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://example.com/logo.png"
              type="url"
            />
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
              isEditing ? "Update" : "Add Activity"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
