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
import { Sparkles, X, Plus, Link as LinkIcon } from "lucide-react"
import { PROJECT_CATEGORIES, LINK_TYPES_BY_CATEGORY, type ProjectLink } from "@/lib/projects"

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (project: {
    title: string
    description: string
    category: string
    status: string
    visibility: string
    tags: string[]
    lookingFor: string[]
    links?: ProjectLink[]
  }) => void
}

export function CreateProjectModal({ open, onOpenChange, onCreate }: CreateProjectModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("other")
  const [status, setStatus] = useState("Planning")
  const [visibility, setVisibility] = useState("public")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [roleInput, setRoleInput] = useState("")
  const [lookingFor, setLookingFor] = useState<string[]>([])
  const [links, setLinks] = useState<ProjectLink[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setCategory("other")
    setStatus("Planning")
    setVisibility("public")
    setTags([])
    setLookingFor([])
    setLinks([])
  }

  const handleSubmit = async () => {
    if (title.trim() && description.trim()) {
      setIsSubmitting(true)
      try {
        const validLinks = links.filter((l) => l.url.trim())
        await onCreate({
          title,
          description,
          category,
          status,
          visibility,
          tags,
          lookingFor,
          links: validLinks.length > 0 ? validLinks : undefined,
        })
        onOpenChange(false)
        resetForm()
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="tags">Tags & Skills</Label>
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
            {isSubmitting ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
