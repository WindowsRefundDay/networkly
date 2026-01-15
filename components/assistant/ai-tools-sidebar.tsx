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
    <div className="flex flex-col h-full">
      {/* Data-Aware Tools */}
      <div className="flex flex-col flex-1 min-h-0">
        <h3 className="text-lg font-bold flex items-center gap-2 px-2 mb-3">
          <User className="h-5 w-5" />
          Your Data
        </h3>
        <div className="flex flex-col flex-1 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {dataTools.map((tool, index) => (
            <div key={tool.label} className="flex-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-4 h-full min-h-[64px] px-4 rounded-none hover:bg-muted/50 text-left"
                onClick={() => handleToolClick(tool.prompt)}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <tool.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <span className="font-semibold text-lg text-foreground block truncate">{tool.label}</span>
                  <p className="text-sm text-muted-foreground truncate">{tool.description}</p>
                </div>
              </Button>
              {index < dataTools.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </div>

      {/* Saved Chat */}
      <div className="mt-6 flex-none">
        <h3 className="text-lg font-bold flex items-center gap-2 px-2 mb-3">
          <History className="h-5 w-5" />
          Saved Chat
        </h3>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedSession ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 border border-border/50">
                <p className="text-base font-semibold text-foreground line-clamp-2">
                  {savedSession.title || 'Untitled Chat'}
                </p>
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                  <span>{new Date(savedSession.updatedAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{savedSession.messages.length} messages</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-11 text-sm font-semibold"
                  onClick={handleLoadSession}
                >
                  <History className="h-4 w-4 mr-2" />
                  Load
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteSession}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-base">No saved chats</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Tools */}
      <div className="mt-6 flex-none">
        <h3 className="text-lg font-bold px-2 mb-3">AI Tools</h3>
        <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {aiTools.map((tool, index) => (
            <div key={tool.label} className="flex-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-4 h-full min-h-[64px] px-4 rounded-none hover:bg-muted/50 text-left"
                onClick={() => handleToolClick(tool.prompt)}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <tool.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <span className="font-semibold text-lg text-foreground block truncate">{tool.label}</span>
                  <p className="text-sm text-muted-foreground truncate">{tool.description}</p>
                </div>
              </Button>
              {index < aiTools.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
