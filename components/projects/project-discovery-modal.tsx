"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, ExternalLink } from "lucide-react"
import { discoverOpportunitiesForProject } from "@/app/actions/goal-discovery"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface ProjectDiscoveryModalProps {
  projectId: string
  projectTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectDiscoveryModal({ projectId, projectTitle, open, onOpenChange }: ProjectDiscoveryModalProps) {
  const [loading, setLoading] = useState(false)
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (open && !hasSearched) {
      handleSearch()
    }
  }, [open])

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await discoverOpportunitiesForProject(projectId)
      if (result.success && result.opportunities) {
        setOpportunities(result.opportunities)
      } else {
        setError(result.message || "Failed to find opportunities")
      }
    } catch (e) {
      setError("An error occurred")
    } finally {
      setLoading(false)
      setHasSearched(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Opportunities for "{projectTitle}"
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-[300px]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Analyzing project goals and searching for opportunities...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-destructive">
              <p>{error}</p>
              <Button variant="outline" onClick={handleSearch}>Try Again</Button>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <p>No specific opportunities found right now.</p>
              <Button variant="outline" onClick={handleSearch}>Refresh</Button>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {opportunities.map((opp, i) => (
                  <div key={i} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{opp.title}</h4>
                        <p className="text-sm text-muted-foreground">{opp.company || opp.organization}</p>
                      </div>
                      <Badge variant="secondary">{opp.type}</Badge>
                    </div>
                    {opp.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{opp.description}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                        <Button size="sm" className="gap-2 w-full sm:w-auto" asChild>
                            <a href={opp.url} target="_blank" rel="noopener noreferrer">
                                View Details <ExternalLink className="h-3 w-3" />
                            </a>
                        </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
