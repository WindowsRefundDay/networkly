"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sparkles, X } from "lucide-react"

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (project: {
    title: string
    description: string
    status: string
    visibility: string
    tags: string[]
    lookingFor: string[]
  }) => void
}

export function CreateProjectModal({ open, onOpenChange, onCreate }: CreateProjectModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("Planning")
  const [visibility, setVisibility] = useState("public")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [roleInput, setRoleInput] = useState("")
  const [lookingFor, setLookingFor] = useState<string[]>([])

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput("")
    }
  }

  const handleAddRole = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && roleInput.trim()) {
      e.preventDefault()
      if (!lookingFor.includes(roleInput.trim())) {
        setLookingFor([...lookingFor, roleInput.trim()])
      }
      setRoleInput("")
    }
  }

  const handleSubmit = () => {
    if (title.trim() && description.trim()) {
      onCreate({
        title,
        description,
        status,
        visibility,
        tags,
        lookingFor,
      })
      onOpenChange(false)
      // Reset form
      setTitle("")
      setDescription("")
      setStatus("Planning")
      setVisibility("public")
      setTags([])
      setLookingFor([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              placeholder="My Awesome Project"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Button variant="ghost" size="sm" className="gap-1 text-primary">
              <Sparkles className="h-4 w-4" />
              AI Enhance Description
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planning">Planning</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Technologies / Tags</Label>
            <Input
              id="tags"
              placeholder="Press Enter to add tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
            />
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lookingFor">Looking for (Roles)</Label>
            <Input
              id="lookingFor"
              placeholder="Press Enter to add roles"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={handleAddRole}
            />
            <div className="flex flex-wrap gap-1">
              {lookingFor.map((role) => (
                <Badge key={role} variant="outline" className="gap-1 border-rose-500/30 text-rose-500">
                  {role}
                  <button onClick={() => setLookingFor(lookingFor.filter((r) => r !== role))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
