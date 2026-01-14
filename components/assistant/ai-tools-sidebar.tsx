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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            Your Data
          </h2>
          <div className="bg-card border border-border/80 rounded-lg overflow-hidden shadow-sm">
            {dataTools.map((tool, index) => (
              <div key={tool.label}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-14 px-3 rounded-none hover:bg-muted/50 text-left transition-colors"
                  onClick={() => handleToolClick(tool.prompt)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <tool.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="font-semibold text-sm text-foreground block truncate">{tool.label}</span>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{tool.description}</p>
                  </div>
                </Button>
                {index < dataTools.length - 1 && <Separator className="mx-3" />}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <History className="h-3.5 w-3.5" />
            Saved Chat
          </h2>
          <div className="bg-card border border-border/80 rounded-lg p-4 shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : savedSession ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-3 border border-border/40">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {savedSession.title || 'Untitled Chat'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                    <span>{new Date(savedSession.updatedAt).toLocaleDateString()}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span>{savedSession.messages.length} messages</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-xs font-medium"
                    onClick={handleLoadSession}
                  >
                    <History className="h-3.5 w-3.5 mr-1.5" />
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
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No saved chats</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            AI Tools
          </h2>
          <div className="bg-card border border-border/80 rounded-lg overflow-hidden shadow-sm">
            {aiTools.map((tool, index) => (
              <div key={tool.label}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-14 px-3 rounded-none hover:bg-muted/50 text-left transition-colors"
                  onClick={() => handleToolClick(tool.prompt)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <tool.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="font-semibold text-sm text-foreground block truncate">{tool.label}</span>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{tool.description}</p>
                  </div>
                </Button>
                {index < aiTools.length - 1 && <Separator className="mx-3" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
