"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { X, Plus, Link as LinkIcon } from "lucide-react"
import { PROJECT_CATEGORIES, LINK_TYPES_BY_CATEGORY, type ProjectLink, type Project } from "@/lib/projects"

interface EditProjectModalProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    id: string,
    data: {
      title: string
      description: string
      category: string
      status: string
      visibility: string
      tags: string[]
      lookingFor: string[]
      progress: number
      links?: ProjectLink[]
    }
  ) => void
}

export function EditProjectModal({ project, open, onOpenChange, onSave }: EditProjectModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("other")
  const [status, setStatus] = useState("Planning")
  const [visibility, setVisibility] = useState("public")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [roleInput, setRoleInput] = useState("")
  const [lookingFor, setLookingFor] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [links, setLinks] = useState<ProjectLink[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (project) {
      setTitle(project.title)
      setDescription(project.description)
      setCategory(project.category)
      setStatus(project.status)
      setVisibility(project.visibility)
      setTags(project.tags || [])
      setLookingFor(project.lookingFor || [])
      setProgress(project.progress || 0)
      setLinks(project.links || [])
    }
  }, [project])

  const linkSuggestions = LINK_TYPES_BY_CATEGORY[category] || LINK_TYPES_BY_CATEGORY.other

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

  const handleAddLink = (type: string, label: string) => {
    if (!links.find((l) => l.type === type)) {
      setLinks([...links, { type, label, url: "" }])
    }
  }

  const handleUpdateLinkUrl = (index: number, url: string) => {
    const newLinks = [...links]
    newLinks[index].url = url
    setLinks(newLinks)
  }

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!project || !title.trim() || !description.trim()) return

    setIsSubmitting(true)
    try {
      const validLinks = links.filter((l) => l.url.trim())
      await onSave(project.id, {
        title,
        description,
        category,
        status,
        visibility,
        tags,
        lookingFor,
        progress,
        links: validLinks.length > 0 ? validLinks : undefined,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Project Title</Label>
            <Input
              id="edit-title"
              placeholder="My Awesome Project"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Describe your project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div className="flex items-center justify-between">
              <Label>Progress</Label>
              <span className="text-sm font-medium text-primary">{progress}%</span>
            </div>
            <Slider
              value={[progress]}
              onValueChange={(value) => setProgress(value[0])}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags & Skills</Label>
            <Input
              id="edit-tags"
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
            <Label htmlFor="edit-lookingFor">Looking for (Roles)</Label>
            <Input
              id="edit-lookingFor"
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

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Links (optional)
            </Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {linkSuggestions.map((suggestion) => (
                <Button
                  key={suggestion.type}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs bg-transparent"
                  onClick={() => handleAddLink(suggestion.type, suggestion.label)}
                  disabled={links.some((l) => l.type === suggestion.type)}
                >
                  <Plus className="h-3 w-3" />
                  {suggestion.label}
                </Button>
              ))}
            </div>
            {links.map((link, index) => (
              <div key={index} className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground w-24 shrink-0">{link.label}</span>
                <Input
                  placeholder={linkSuggestions.find((s) => s.type === link.type)?.placeholder || "https://..."}
                  value={link.url}
                  onChange={(e) => handleUpdateLinkUrl(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleRemoveLink(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim() || !description.trim()}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
