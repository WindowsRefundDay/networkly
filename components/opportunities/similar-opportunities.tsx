"use client"

import { useEffect, useState } from "react"
import { getSimilarOpportunities } from "@/app/actions/similar-opportunities"
import { OpportunityCard } from "./opportunity-card"
import { Loader2 } from "lucide-react"
import type { Opportunity } from "@/types/opportunity"

interface SimilarOpportunitiesProps {
    opportunityId: string
    onSelect: (opp: Opportunity) => void
    onToggleSave: (e: React.MouseEvent, id: string) => void
}

export function SimilarOpportunities({ opportunityId, onSelect, onToggleSave }: SimilarOpportunitiesProps) {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSimilar = async () => {
            try {
                const data = await getSimilarOpportunities(opportunityId)
                setOpportunities(data as any[]) 
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        if (opportunityId) fetchSimilar()
    }, [opportunityId])

    if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto my-4 text-muted-foreground" />
    if (opportunities.length === 0) return null

    return (
        <div className="space-y-4 mt-8 border-t border-border/50 pt-8">
            <h3 className="text-lg font-semibold px-1">You might also like</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {opportunities.map(opp => (
                    <div key={opp.id} className="h-[280px]">
                        <OpportunityCard 
                            opportunity={opp} 
                            isSelected={false} 
                            onSelect={onSelect}
                            onToggleSave={onToggleSave}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
