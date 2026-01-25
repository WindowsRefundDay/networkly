'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Mail, 
  MessageSquare, 
  Target, 
  Calendar,
  User,
  Briefcase,
  Bookmark,
  FolderKanban,
  History,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { getSavedChatSession, deleteChatSession, type ChatSession } from '@/app/actions/chat'

interface AIToolsSidebarProps {
  onToolClick?: (prompt: string) => void
  onLoadSession?: (session: ChatSession) => void
}

const aiTools = [
  { icon: FileText, label: 'Cover Letter', description: 'AI-generated cover letters', prompt: 'Help me write a cover letter for' },
  { icon: Mail, label: 'Email Drafts', description: 'Professional networking emails', prompt: 'Draft a professional email to' },
  { icon: MessageSquare, label: 'Icebreakers', description: 'Conversation starters', prompt: 'Give me some icebreakers for networking at' },
  { icon: Target, label: 'Career Path', description: 'Personalized roadmap', prompt: 'Create a career roadmap for me based on my profile' },
  { icon: Calendar, label: 'Interview Prep', description: 'Practice questions', prompt: 'Help me prepare for an interview at' },
]

const dataTools = [
  { icon: User, label: 'My Profile', description: 'View your skills & interests', prompt: 'What do you know about my profile?' },
  { icon: Briefcase, label: 'My Activities', description: 'Your extracurriculars', prompt: 'Show me my extracurricular activities' },
  { icon: Bookmark, label: 'Saved Opportunities', description: 'Your bookmarks', prompt: 'Show me my saved opportunities' },
  { icon: FolderKanban, label: 'My Projects', description: 'Your project portfolio', prompt: 'What projects do I have?' },
  { icon: Target, label: 'My Goals', description: 'Your career goals', prompt: 'What are my career goals?' },
]

export function AIToolsSidebar({ onToolClick, onLoadSession }: AIToolsSidebarProps) {
  const [savedSession, setSavedSession] = useState<ChatSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load saved session on mount
  useEffect(() => {
    setIsLoading(true)
    getSavedChatSession()
      .then(setSavedSession)
      .finally(() => setIsLoading(false))
  }, [])

  const handleDeleteSession = async () => {
    setIsDeleting(true)
    try {
      await deleteChatSession()
      setSavedSession(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLoadSession = () => {
    if (savedSession && onLoadSession) {
      onLoadSession(savedSession)
    }
  }

  const handleToolClick = (prompt: string) => {
    onToolClick?.(prompt)
  }

  return (
    <div className="flex flex-col gap-8 pt-12 pb-8">
      {/* Data-Aware Tools */}
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1 mb-4">
          <User className="h-4 w-4" />
          Your Data
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {dataTools.map((tool) => (
            <Button 
              key={tool.label}
              variant="outline" 
              className="group w-full justify-start gap-4 p-4 h-auto bg-card hover:bg-muted/50 border-border/50 hover:border-primary/30 transition-all duration-200 rounded-xl text-left"
              onClick={() => handleToolClick(tool.prompt)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <tool.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">{tool.label}</span>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{tool.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Saved Chat */}
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1 mb-4">
          <History className="h-4 w-4" />
          Saved Chat
        </h3>
        <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : savedSession ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 border border-border/30">
                <p className="text-sm font-semibold text-foreground line-clamp-2">
                  {savedSession.title || 'Untitled Chat'}
                </p>
                <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-2 uppercase tracking-tight">
                  <span>{new Date(savedSession.updatedAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{savedSession.messages.length} messages</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 text-xs font-semibold"
                  onClick={handleLoadSession}
                >
                  <History className="h-3.5 w-3.5 mr-2" />
                  Load
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteSession}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No saved chats</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Tools */}
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1 mb-4">
          <Sparkles className="h-4 w-4" />
          AI Tools
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {aiTools.map((tool) => (
            <Button 
              key={tool.label}
              variant="outline" 
              className="group w-full justify-start gap-4 p-4 h-auto bg-card hover:bg-muted/50 border-border/50 hover:border-blue-500/30 transition-all duration-200 rounded-xl text-left"
              onClick={() => handleToolClick(tool.prompt)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <tool.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">{tool.label}</span>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{tool.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
