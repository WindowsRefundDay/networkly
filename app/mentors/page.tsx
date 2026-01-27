"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2, GraduationCap, Sparkles } from "lucide-react"
import { MentorCard } from "@/components/mentors/mentor-card"
import { searchMentors, getSuggestedMentors, saveMentor, getSavedMentors, type Mentor } from "@/app/actions/mentors"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { toast } from "sonner"

export default function MentorsPage() {
  const [query, setQuery] = useState("")
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [savedMentors, setSavedMentors] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const [suggestions, saved] = await Promise.all([
          getSuggestedMentors(),
          getSavedMentors()
        ])
        setMentors(suggestions)
        setSavedMentors(new Set(saved.map(m => m.id)))
      } catch (error) {
        console.error("Failed to load mentors:", error)
        toast.error("Failed to load mentor suggestions")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const performSearch = useDebouncedCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setIsSearching(false)
      const suggestions = await getSuggestedMentors()
      setMentors(suggestions)
      return
    }

    setIsSearching(true)
    try {
      const result = await searchMentors(searchQuery)
      setMentors(result.mentors)
    } catch (error) {
      console.error("Search failed:", error)
      toast.error("Failed to search mentors")
    } finally {
      setIsSearching(false)
    }
  }, 500)

  const handleSearchChange = (value: string) => {
    setQuery(value)
    performSearch(value)
  }

  const handleSave = async (mentorId: string) => {
    try {
      const mentor = mentors.find(m => m.id === mentorId)
      if (!mentor) return

      // Optimistic update
      setSavedMentors(prev => new Set([...prev, mentorId]))
      toast.success("Mentor saved to your network")

      await saveMentor(mentorId, mentor)
    } catch (error) {
      console.error("Failed to save mentor:", error)
      setSavedMentors(prev => {
        const next = new Set(prev)
        next.delete(mentorId)
        return next
      })
      toast.error("Failed to save mentor")
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 max-w-7xl py-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Find Mentors</h1>
          <p className="text-muted-foreground">
            Connect with professors and researchers in your field of interest.
          </p>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by research area, name, or university..."
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 h-12 text-base bg-muted/50 border-border/50 focus:bg-background"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {query ? (
              <>
                <Search className="h-4 w-4" />
                Search Results
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-primary" />
                Suggested for You
              </>
            )}
          </div>

          {mentors.length === 0 ? (
            <div className="text-center py-20 border rounded-xl bg-muted/20 border-dashed">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No mentors found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or updating your profile interests.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {mentors.map((mentor) => (
                  <motion.div
                    key={mentor.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <MentorCard
                      mentor={mentor}
                      onSave={handleSave}
                      isSaved={savedMentors.has(mentor.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
