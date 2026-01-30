"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Sparkles, Users, FolderOpen, Loader2, Filter } from "lucide-react"
import { BentoGrid, BentoItem } from "@/components/dashboard/new/bento-grid"
import { ProjectCard } from "@/components/projects/project-card"
import { ProjectDetailModal } from "@/components/projects/project-detail-modal"
import { CreateProjectModal } from "@/components/projects/create-project-modal"
import { EditProjectModal } from "@/components/projects/edit-project-modal"
import { ProjectUpdatesFeed } from "@/components/projects/project-updates-feed"
import {
  getMyProjects,
  getDiscoverProjects,
  getProjectsLookingForHelp,
  createProject,
  updateProject,
  deleteProject,
  likeProject,
} from "@/app/actions/projects"
import { PROJECT_CATEGORIES, type Project, type ProjectLink } from "@/lib/projects"

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [discoverProjects, setDiscoverProjects] = useState<Project[]>([])
  const [helpProjects, setHelpProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("my-projects")

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const [myData, discoverData, helpData] = await Promise.all([
        getMyProjects(categoryFilter),
        getDiscoverProjects(categoryFilter),
        getProjectsLookingForHelp(categoryFilter),
      ])

      setMyProjects(myData as Project[])
      setDiscoverProjects(discoverData as Project[])
      setHelpProjects(helpData as Project[])
    } catch (error) {
      console.error("[Projects] Failed to fetch projects:", error)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filteredProjects = (list: Project[]) =>
    list.filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )

  const handleCreateProject = async (projectData: {
    title: string
    description: string
    category: string
    status: string
    visibility: string
    tags: string[]
    lookingFor: string[]
    links?: ProjectLink[]
  }) => {
    try {
      const result = await createProject(projectData)
      if (result.success && result.project) {
        setMyProjects([result.project as Project, ...myProjects])
      }
    } catch (error) {
      console.error("[Projects] Failed to create project:", error)
    }
  }

  const handleUpdateProject = async (
    id: string,
    data: {
      status?: string
      progress?: number
      visibility?: string
      title?: string
      description?: string
      category?: string
      tags?: string[]
      lookingFor?: string[]
      links?: ProjectLink[]
    }
  ) => {
    try {
      const result = await updateProject(id, data)
      if (result.success && result.project) {
        const updatedProject = result.project as Project
        setMyProjects(myProjects.map((p) => (p.id === id ? updatedProject : p)))
        // Also update in other lists if the project exists there
        setDiscoverProjects(discoverProjects.map((p) => (p.id === id ? updatedProject : p)))
        setHelpProjects(helpProjects.map((p) => (p.id === id ? updatedProject : p)))
      }
    } catch (error) {
      console.error("[Projects] Failed to update project:", error)
    }
  }

  const handleDeleteProject = async (id: string) => {
    try {
      const result = await deleteProject(id)
      if (result.success) {
        setMyProjects(myProjects.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error("[Projects] Failed to delete project:", error)
    }
  }

  const handleLike = async (id: string) => {
    try {
      const result = await likeProject(id)
      if (result.success) {
        const updateLikes = (projects: Project[]) =>
          projects.map((p) => (p.id === id ? { ...p, likes: result.likes } : p))
        setMyProjects(updateLikes(myProjects))
        setDiscoverProjects(updateLikes(discoverProjects))
        setHelpProjects(updateLikes(helpProjects))
      }
    } catch (error) {
      console.error("[Projects] Failed to like project:", error)
    }
  }

  const EmptyState = ({ type }: { type: "my" | "discover" | "help" }) => {
    const configs = {
      my: {
        icon: FolderOpen,
        title: "No projects yet",
        description: "Create your first project to showcase your work and find collaborators.",
        action: (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-1 mt-4">
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        ),
      },
      discover: {
        icon: Sparkles,
        title: "No projects to discover",
        description: "There are no public projects from other users at the moment.",
        action: null,
      },
      help: {
        icon: Users,
        title: "No projects looking for help",
        description: "Check back later for projects seeking collaborators.",
        action: null,
      },
    }

    const config = configs[type]
    const Icon = config.icon

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="type-h4 mb-1">{config.title}</h3>
        <p className="type-muted max-w-sm">{config.description}</p>
        {config.action}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 container mx-auto px-4 sm:px-6 max-w-7xl py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 container mx-auto px-4 sm:px-6 max-w-7xl py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="type-h2">Project Showcase</h1>
          <p className="type-muted">Share your work and find collaborators</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {PROJECT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <BentoGrid>
        <BentoItem colSpan={{ lg: 9 }} variant="ghost">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="my-projects">My Projects ({myProjects.length})</TabsTrigger>
              <TabsTrigger value="discover">
                <Sparkles className="h-4 w-4 mr-1" />
                Discover ({discoverProjects.length})
              </TabsTrigger>
              <TabsTrigger value="looking-for-help">
                <Users className="h-4 w-4 mr-1" />
                Looking for Help ({helpProjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-projects" className="mt-6">
              {filteredProjects(myProjects).length === 0 ? (
                searchQuery ? (
                  <div className="text-center py-8 text-muted-foreground">No projects match your search.</div>
                ) : (
                  <EmptyState type="my" />
                )
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {filteredProjects(myProjects).map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isOwner={true}
                      onLike={handleLike}
                      onEdit={(id, data) => handleUpdateProject(id, data)}
                      onDelete={handleDeleteProject}
                      onViewDetails={setSelectedProject}
                      onOpenEditModal={setEditingProject}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="discover" className="mt-6">
              {filteredProjects(discoverProjects).length === 0 ? (
                searchQuery ? (
                  <div className="text-center py-8 text-muted-foreground">No projects match your search.</div>
                ) : (
                  <EmptyState type="discover" />
                )
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {filteredProjects(discoverProjects).map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isOwner={false}
                      onLike={handleLike}
                      onViewDetails={setSelectedProject}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="looking-for-help" className="mt-6">
              {filteredProjects(helpProjects).length === 0 ? (
                searchQuery ? (
                  <div className="text-center py-8 text-muted-foreground">No projects match your search.</div>
                ) : (
                  <EmptyState type="help" />
                )
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {filteredProjects(helpProjects).map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isOwner={false}
                      onLike={handleLike}
                      onViewDetails={setSelectedProject}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </BentoItem>

        <BentoItem colSpan={{ lg: 3 }} variant="ghost">
          <ProjectUpdatesFeed />
        </BentoItem>
      </BentoGrid>

      <ProjectDetailModal
        project={selectedProject}
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
      />

      <CreateProjectModal open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreate={handleCreateProject} />

      <EditProjectModal
        project={editingProject}
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        onSave={handleUpdateProject}
      />
    </div>
  )
}
