"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Heart, Eye, MessageCircle, Lock, Globe, Users, MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react"
import Image from "next/image"
import { type Project, PROJECT_CATEGORIES } from "@/lib/projects"

interface ProjectCardProps {
  project: Project
  isOwner?: boolean
  onLike?: (id: string) => void
  onEdit?: (id: string, data: { status?: string; progress?: number; visibility?: string }) => void
  onDelete?: (id: string) => void
  onViewDetails?: (project: Project) => void
  onOpenEditModal?: (project: Project) => void
}

export function ProjectCard({ project, isOwner = false, onLike, onEdit, onDelete, onViewDetails, onOpenEditModal }: ProjectCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const statusColors: Record<string, string> = {
    "In Progress": "bg-primary/10 text-primary",
    Completed: "bg-secondary/10 text-secondary",
    Planning: "bg-amber-500/10 text-amber-500",
    "On Hold": "bg-muted text-muted-foreground",
  }

  const categoryLabel = PROJECT_CATEGORIES.find((c) => c.value === project.category)?.label || project.category

  const handleDelete = () => {
    onDelete?.(project.id)
    setShowDeleteDialog(false)
  }

  // Get primary link for quick access
  const primaryLink = project.links?.[0]

  return (
    <>
      <GlassCard className="border-border overflow-hidden">
        <div className="relative aspect-video overflow-hidden cursor-pointer" onClick={() => onViewDetails?.(project)}>
          <Image
            src={project.image || "/placeholder.svg"}
            alt={project.title}
            fill
            className="object-cover"
          />
          <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
            <Badge className={`${statusColors[project.status] || statusColors.Planning} border-0`}>
              {project.status}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {categoryLabel}
            </Badge>
            {project.visibility === "private" ? (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Private
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Globe className="h-3 w-3" />
                Public
              </Badge>
            )}
          </div>
          {project.lookingFor.length > 0 && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-rose-500 text-white border-0 gap-1">
                <Users className="h-3 w-3" />
                Looking for help
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewDetails?.(project)}>
              <h3 className="font-semibold text-lg text-foreground truncate">{project.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{project.description}</p>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails?.(project)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOpenEditModal?.(project)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Project
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onEdit?.(project.id, {
                        visibility: project.visibility === "public" ? "private" : "public",
                      })
                    }
                  >
                    {project.visibility === "public" ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Make Private
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-2" />
                        Make Public
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onEdit?.(project.id, {
                        status: project.status === "In Progress" ? "Completed" : "In Progress",
                      })
                    }
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Toggle Status
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {project.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {project.tags.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{project.tags.length - 4}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {project.collaborators.slice(0, 4).map((collaborator) => (
                <Avatar key={collaborator.id} className="h-8 w-8 border-2 border-card">
                  <AvatarImage src={collaborator.avatar || "/placeholder.svg"} alt={collaborator.name} />
                  <AvatarFallback>{collaborator.name[0]}</AvatarFallback>
                </Avatar>
              ))}
              {project.collaborators.length > 4 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium border-2 border-card">
                  +{project.collaborators.length - 4}
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">Updated {project.updatedAt}</span>
          </div>
        </CardContent>

        <CardFooter className="border-t border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <button
              onClick={() => onLike?.(project.id)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Heart className="h-4 w-4" />
              {project.likes}
            </button>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {project.views}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {project.comments}
            </span>
          </div>
          <div className="flex gap-2">
            {primaryLink && (
              <Button size="sm" variant="ghost" className="h-8 px-2 gap-1" asChild>
                <a href={primaryLink.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-xs">{primaryLink.label}</span>
                </a>
              </Button>
            )}
          </div>
        </CardFooter>
      </GlassCard>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{project.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
