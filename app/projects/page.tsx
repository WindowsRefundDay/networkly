"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Sparkles, Users } from "lucide-react"
import { ProjectCard } from "@/components/projects/project-card"
import { ProjectDetailModal } from "@/components/projects/project-detail-modal"
import { CreateProjectModal } from "@/components/projects/create-project-modal"
import { ProjectUpdatesFeed } from "@/components/projects/project-updates-feed"
import { getProjects, createProject } from "@/app/actions/projects"

interface Project {
  id: string
  title: string
  description: string
  image: string | null
  status: string
  visibility: string
  collaborators: { id: string; name: string; avatar: string | null; role: string }[]
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

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      const data = await getProjects()
      setProjects(data as Project[])
      setLoading(false)
    }
    fetchProjects()
  }, [])

  const myProjects = projects
  const lookingForHelp = projects.filter((p) => p.lookingFor.length > 0)

  const filteredProjects = (list: typeof projects) =>
    list.filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
    )

  const handleCreateProject = async (projectData: {
    title: string
    description: string
    status: string
    visibility: string
    tags: string[]
    lookingFor: string[]
  }) => {
    const result = await createProject({
      title: projectData.title,
      description: projectData.description,
      status: projectData.status,
      visibility: projectData.visibility,
      tags: projectData.tags,
      lookingFor: projectData.lookingFor
    })
    if (result.success && result.project) {
      setProjects([result.project as Project, ...projects])
    }
  }

  const handleLike = (id: string) => {
    setProjects(projects.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Showcase</h1>
          <p className="text-muted-foreground">Share your work and find collaborators</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="my-projects">
            <TabsList>
              <TabsTrigger value="my-projects">My Projects ({myProjects.length})</TabsTrigger>
              <TabsTrigger value="discover">
                <Sparkles className="h-4 w-4 mr-1" />
                Discover
              </TabsTrigger>
              <TabsTrigger value="looking-for-help">
                <Users className="h-4 w-4 mr-1" />
                Looking for Help ({lookingForHelp.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-projects" className="mt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {filteredProjects(myProjects).map((project) => (
                  <ProjectCard key={project.id} project={project} onLike={handleLike} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="discover" className="mt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {filteredProjects(projects).map((project) => (
                  <ProjectCard key={project.id} project={project} onLike={handleLike} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="looking-for-help" className="mt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {filteredProjects(lookingForHelp).map((project) => (
                  <ProjectCard key={project.id} project={project} onLike={handleLike} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <ProjectUpdatesFeed />
        </div>
      </div>

      <ProjectDetailModal
        project={selectedProject}
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
      />

      <CreateProjectModal open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreate={handleCreateProject} />
    </div>
  )
}
