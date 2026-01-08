"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Heart, Eye, MessageCircle, Github, ExternalLink, Lock, Globe, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Collaborator {
  id: string
  name: string
  avatar: string
  role: string
}

interface Project {
  id: string
  title: string
  description: string
  image: string
  status: string
  visibility: string
  collaborators: Collaborator[]
  likes: number
  views: number
  comments: number
  tags: string[]
  progress: number
  createdAt: string
  updatedAt: string
  github: string | null
  demo: string | null
  lookingFor: string[]
}

interface ProjectCardProps {
  project: Project
  onLike?: (id: string) => void
}

export function ProjectCard({ project, onLike }: ProjectCardProps) {
  const statusColors: Record<string, string> = {
    "In Progress": "bg-primary/10 text-primary",
    Completed: "bg-secondary/10 text-secondary",
    Planning: "bg-amber-500/10 text-amber-500",
    "On Hold": "bg-muted text-muted-foreground",
  }

  return (
    <Card className="border-border overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={project.image || "/placeholder.svg"}
          alt={project.title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className={`${statusColors[project.status] || statusColors.Planning} border-0`}>
            {project.status}
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
        <div>
          <h3 className="font-semibold text-lg text-foreground">{project.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{project.description}</p>
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
          {project.github && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
              <Link href={project.github} target="_blank">
                <Github className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {project.demo && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
              <Link href={project.demo} target="_blank">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
