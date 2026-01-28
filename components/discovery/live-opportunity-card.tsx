"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LiveOpportunity {
    id: string
    title: string
    organization?: string
    category?: string
    opportunityType?: string
    url?: string
    locationType?: string
    confidence?: number
}

interface LiveOpportunityCardProps {
    opportunity: LiveOpportunity
    onClick?: (opportunity: LiveOpportunity) => void
    index?: number
}

const cardVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24,
            delay: i * 0.1,
        },
    }),
}

export function LiveOpportunityCard({
    opportunity,
    onClick,
    index = 0
}: LiveOpportunityCardProps) {
    const confidenceColor = opportunity.confidence && opportunity.confidence >= 0.8
        ? "text-green-500"
        : opportunity.confidence && opportunity.confidence >= 0.6
            ? "text-amber-500"
            : "text-muted-foreground"

    return (
        <motion.div
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick?.(opportunity)}
            className="cursor-pointer"
        >
            <Card className={cn(
                "p-3 border-border/50 bg-card/80 backdrop-blur-sm",
                "hover:shadow-md hover:border-primary/30 transition-all duration-200",
                "ring-2 ring-primary/20 ring-offset-0"
            )}>
                <div className="flex items-start gap-3">
                    {/* Icon/Logo placeholder */}
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Title */}
                        <h4 className="font-medium text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary">
                            {opportunity.title}
                        </h4>

                        {/* Organization & Location */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {opportunity.organization && (
                                <span className="truncate">{opportunity.organization}</span>
                            )}
                            {opportunity.locationType && (
                                <>
                                    <span className="text-border">•</span>
                                    <span className="flex items-center gap-0.5">
                                        <MapPin className="h-3 w-3" />
                                        {opportunity.locationType}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5">
                            {opportunity.opportunityType && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                    {opportunity.opportunityType}
                                </Badge>
                            )}
                            {opportunity.category && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border/50">
                                    {opportunity.category}
                                </Badge>
                            )}
                            {opportunity.confidence && (
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", confidenceColor)}>
                                    {Math.round(opportunity.confidence * 100)}% match
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* External link indicator */}
                    {opportunity.url && (
                        <ExternalLink className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    )}
                </div>
            </Card>
        </motion.div>
    )
}
