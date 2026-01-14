"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Heart,
  Eye,
  MessageCircle,
  ExternalLink,
  Lock,
  Globe,
  Users,
  Sparkles,
  Calendar,
  UserPlus,
  Link as LinkIcon,
} from "lucide-react"
import Image from "next/image"
import { type Project, PROJECT_CATEGORIES } from "@/lib/projects"

interface ProjectDetailModalProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectDetailModal({ project, open, onOpenChange }: ProjectDetailModalProps) {
  if (!project) return null

  const statusColors: Record<string, string> = {
    "In Progress": "bg-primary/10 text-primary",
    Completed: "bg-secondary/10 text-secondary",
    Planning: "bg-amber-500/10 text-amber-500",
    "On Hold": "bg-muted text-muted-foreground",
  }

  const categoryInfo = PROJECT_CATEGORIES.find((c) => c.value === project.category)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0">
              <Image src={project.image || "/placeholder.svg"} alt={project.title} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{project.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={`${statusColors[project.status]} border-0`}>{project.status}</Badge>
                <Badge variant="outline">{categoryInfo?.label || project.category}</Badge>
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
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  {project.likes}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {project.views}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  {project.comments}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {project.createdAt}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div>
            <h4 className="font-medium text-foreground mb-2">About</h4>
            <p className="text-muted-foreground leading-relaxed">{project.description}</p>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Tags & Skills</h4>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Progress</h4>
              <span className="text-sm font-medium text-primary">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-3" />
          </div>

          {project.links && project.links.length > 0 && (
            <div>
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Links
              </h4>
              <div className="flex flex-wrap gap-2">
                {project.links.map((link, index) => (
                  <Button key={index} variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                      {link.label}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team ({project.collaborators.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={collaborator.avatar || "/placeholder.svg"} alt={collaborator.name} />
                    <AvatarFallback>{collaborator.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground text-sm">{collaborator.name}</p>
                    <p className="text-xs text-muted-foreground">{collaborator.role}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {project.lookingFor.length > 0 && (
            <Card className="border-border bg-rose-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-rose-500" />
                  Looking for Contributors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.lookingFor.map((role) => (
                    <Badge key={role} variant="outline" className="border-rose-500/30 text-rose-500">
                      {role}
                    </Badge>
                  ))}
                </div>
                <Button className="w-full mt-4 gap-2">
                  <UserPlus className="h-4 w-4" />
                  Request to Join
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            {project.links && project.links.length > 0 && (
              <Button className="flex-1 gap-2" asChild>
                <a href={project.links[0].url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {project.links[0].label}
                </a>
              </Button>
            )}
            <Button variant="outline" className="gap-2 bg-transparent">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Feedback
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
