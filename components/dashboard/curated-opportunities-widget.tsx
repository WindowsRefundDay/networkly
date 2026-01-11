"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { getCuratedOpportunities } from "@/app/actions/opportunities"

interface CuratedOpportunity {
    id: string
    title: string
    company: string
    matchScore: number
    logo: string | null
    type: string
}

export function CuratedOpportunitiesWidget() {
    const [opportunities, setOpportunities] = useState<CuratedOpportunity[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchCurated() {
            try {
                const data = await getCuratedOpportunities()
                setOpportunities(
                    data.slice(0, 3).map((opp) => ({
                        id: opp.id,
                        title: opp.title,
                        company: opp.company,
                        matchScore: opp.matchScore,
                        logo: opp.logo,
                        type: opp.type,
                    }))
                )
            } catch (error) {
                console.error("Failed to fetch curated opportunities:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchCurated()
    }, [])

    const getMatchColor = (score: number) => {
        if (score >= 90) return "text-secondary bg-secondary/10"
        if (score >= 75) return "text-primary bg-primary/10"
        if (score >= 60) return "text-amber-500 bg-amber-500/10"
        return "text-muted-foreground bg-muted"
    }

    if (loading) {
        return (
            <Card className="border-border">
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-border">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Your Opportunities
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {opportunities.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No saved opportunities yet</p>
                        <Link href="/opportunities">
                            <Button variant="link" size="sm" className="mt-2">
                                Explore opportunities
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        {opportunities.map((opp) => (
                            <Link key={opp.id} href={`/opportunities?selected=${opp.id}`}>
                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                    <Avatar className="h-10 w-10 rounded-lg shrink-0">
                                        <AvatarImage src={opp.logo || "/placeholder.svg"} alt={opp.company} />
                                        <AvatarFallback className="rounded-lg">{opp.company[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground text-sm truncate">{opp.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{opp.company}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${getMatchColor(opp.matchScore)}`}>
                                        <Sparkles className="h-3 w-3" />
                                        {opp.matchScore}%
                                    </div>
                                </div>
                            </Link>
                        ))}
                        <Link href="/opportunities">
                            <Button variant="ghost" size="sm" className="w-full gap-1 mt-2">
                                View all
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
