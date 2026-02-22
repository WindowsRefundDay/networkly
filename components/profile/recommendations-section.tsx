"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Quote, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface Recommendation {
  id: string
  author: string
  role: string
  avatar: string | null
  content: string
  date: string
}

interface RecommendationsSectionProps {
  recommendations?: Recommendation[]
}

const INITIAL_DISPLAY_COUNT = 2

export function RecommendationsSection({ recommendations = [] }: RecommendationsSectionProps) {
  const [showAll, setShowAll] = useState(false)
  
  const displayedRecs = showAll ? recommendations : recommendations.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMore = recommendations.length > INITIAL_DISPLAY_COUNT
  const remainingCount = recommendations.length - INITIAL_DISPLAY_COUNT

  const handleRequestRecommendation = () => {
    toast.info("Recommendation requests coming soon!", {
      description: "This feature is currently in development."
    })
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Recommendations</CardTitle>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1 bg-transparent"
            onClick={handleRequestRecommendation}
          >
            <Plus className="h-4 w-4" />
            Request
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Quote className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground italic">No recommendations yet.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Request recommendations from colleagues and mentors
            </p>
          </div>
        ) : (
          <>
            {displayedRecs.map((rec, index) => (
              <div
                key={rec.id}
                className={`relative ${index !== displayedRecs.length - 1 ? "pb-4 border-b border-border" : ""}`}
              >
                <Quote className="absolute -left-1 -top-1 h-6 w-6 text-muted-foreground/20" />
                <p className="text-muted-foreground leading-relaxed pl-4 mb-3">{rec.content}</p>
                <div className="flex items-center gap-3 pl-4">
                  <Avatar className="h-10 w-10">
                    {rec.avatar ? (
                      <Image
                        src={rec.avatar}
                        alt={rec.author}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <AvatarFallback>{rec.author[0]}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">{rec.author}</h4>
                    <p className="text-xs text-muted-foreground">{rec.role}</p>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">{rec.date}</span>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div className="pt-2">
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAll(!showAll)}
                >
                  <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showAll ? "rotate-180" : ""}`} />
                  {showAll ? "Show less" : `Show ${remainingCount} more recommendation${remainingCount > 1 ? "s" : ""}`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
