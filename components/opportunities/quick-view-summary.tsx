"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Loader2,
    Eye,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Zap,
    Calendar,
    Target,
    Shield,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface OpportunitySummary {
    eligibility: string
    value_prop: string
    difficulty_level: string // beginner | intermediate | advanced
    deadline_status: string // urgent | soon | flexible | expired
    one_sentence_summary: string
    is_expired: boolean
    extraction_confidence: number
}

interface SummarizeResponse {
    success: boolean
    summary?: OpportunitySummary
    error?: string
    cached: boolean
    processing_time_ms: number
}

interface QuickViewSummaryProps {
    opportunityId: string
    url: string
    className?: string
    /** Inline mode: renders as an expandable section instead of a button */
    inline?: boolean
    /** Compact trigger: just shows an icon button */
    compact?: boolean
}

const difficultyConfig = {
    beginner: {
        label: "Beginner",
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        icon: "🟢",
        description: "Open to all, no prerequisites",
    },
    intermediate: {
        label: "Intermediate",
        color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        icon: "🟡",
        description: "Some experience required",
    },
    advanced: {
        label: "Advanced",
        color: "bg-red-500/10 text-red-600 border-red-500/20",
        icon: "🔴",
        description: "Highly selective",
    },
}

const deadlineConfig = {
    urgent: {
        label: "Urgent",
        color: "bg-red-500/10 text-red-600 border-red-500/20",
        icon: <Zap className="h-3 w-3" />,
        emoji: "⚡",
    },
    soon: {
        label: "Closing Soon",
        color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        icon: <Clock className="h-3 w-3" />,
        emoji: "⏰",
    },
    flexible: {
        label: "Flexible",
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        icon: <Calendar className="h-3 w-3" />,
        emoji: "📅",
    },
    expired: {
        label: "Expired",
        color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
        icon: <XCircle className="h-3 w-3" />,
        emoji: "❌",
    },
}

export function QuickViewSummary({
    opportunityId,
    url,
    className,
    inline = false,
    compact = false,
}: QuickViewSummaryProps) {
    const [summary, setSummary] = useState<SummarizeResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchSummary = useCallback(
        async (forceRefresh = false) => {
            if (!url || !opportunityId) return

            setIsLoading(true)
            setError(null)

            try {
                const res = await fetch("/api/discovery/summarize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        opportunityId,
                        url,
                        forceRefresh,
                    }),
                })

                if (res.status === 429) {
                    toast.error("Rate limit reached. Try again in a minute.", {
                        description: "You can generate up to 5 summaries per minute.",
                    })
                    setError("Rate limited")
                    return
                }

                if (res.status === 401) {
                    toast.error("Please log in to use Quick View.")
                    setError("Unauthorized")
                    return
                }

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}))
                    throw new Error(errorData.error || `Error ${res.status}`)
                }

                const data: SummarizeResponse = await res.json()
                setSummary(data)

                if (!data.success) {
                    setError(data.error || "Failed to generate summary")
                } else {
                    setIsExpanded(true)
                }
            } catch (err: any) {
                console.error("[QuickView] Error:", err)
                setError(err.message || "Failed to load summary")
                toast.error("Couldn't generate summary", {
                    description: err.message,
                })
            } finally {
                setIsLoading(false)
            }
        },
        [opportunityId, url]
    )

    const handleClick = () => {
        if (summary?.success) {
            setIsExpanded(!isExpanded)
        } else {
            fetchSummary()
        }
    }

    const difficulty =
        summary?.summary?.difficulty_level &&
        difficultyConfig[summary.summary.difficulty_level as keyof typeof difficultyConfig]
    const deadline =
        summary?.summary?.deadline_status &&
        deadlineConfig[summary.summary.deadline_status as keyof typeof deadlineConfig]

    const confidencePercent = Math.round((summary?.summary?.extraction_confidence ?? 0) * 100)

    // Compact button mode (for card grids)
    if (compact) {
        return (
            <div className={className}>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                        e.stopPropagation()
                        handleClick()
                    }}
                    disabled={isLoading}
                    className={cn(
                        "h-8 w-8 rounded-full transition-all",
                        summary?.success
                            ? "text-primary hover:bg-primary/10"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Quick View Summary"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Eye className="h-4 w-4" />
                    )}
                </Button>
            </div>
        )
    }

    return (
        <div className={cn("space-y-2", className)}>
            {/* Trigger Button */}
            <Button
                variant={summary?.success ? "ghost" : "outline"}
                size="sm"
                onClick={(e) => {
                    e.stopPropagation()
                    handleClick()
                }}
                disabled={isLoading}
                className={cn(
                    "gap-2 text-xs w-full justify-between transition-all",
                    summary?.success && "border border-border/50 hover:bg-muted/50"
                )}
            >
                <span className="flex items-center gap-2">
                    {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : summary?.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : error ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                        <Eye className="h-3.5 w-3.5" />
                    )}
                    {isLoading
                        ? "Analyzing page..."
                        : summary?.success
                            ? "AI Summary"
                            : error
                                ? "Retry Summary"
                                : "Quick View"}
                </span>

                <span className="flex items-center gap-1.5">
                    {summary?.cached && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                            Cached
                        </Badge>
                    )}
                    {summary?.success && (
                        isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )
                    )}
                </span>
            </Button>

            {/* Summary Content */}
            <AnimatePresence>
                {isExpanded && summary?.success && summary.summary && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3">
                            {/* One-sentence summary */}
                            <p className="text-sm font-medium text-foreground leading-snug">
                                {summary.summary.one_sentence_summary}
                            </p>

                            {/* Badges Row */}
                            <div className="flex flex-wrap gap-1.5">
                                {difficulty && (
                                    <Badge
                                        variant="outline"
                                        className={cn("text-[11px] px-2 py-0.5", difficulty.color)}
                                    >
                                        {difficulty.icon} {difficulty.label}
                                    </Badge>
                                )}
                                {deadline && (
                                    <Badge
                                        variant="outline"
                                        className={cn("text-[11px] px-2 py-0.5 gap-1", deadline.color)}
                                    >
                                        {deadline.emoji} {deadline.label}
                                    </Badge>
                                )}
                                {summary.summary.is_expired && (
                                    <Badge
                                        variant="outline"
                                        className="text-[11px] px-2 py-0.5 bg-red-500/10 text-red-500 border-red-500/20"
                                    >
                                        ❌ Expired
                                    </Badge>
                                )}
                            </div>

                            {/* Eligibility */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Target className="h-3 w-3" />
                                    Eligibility
                                </div>
                                <p className="text-xs text-foreground/80 leading-relaxed pl-4.5">
                                    {summary.summary.eligibility}
                                </p>
                            </div>

                            {/* Value Proposition */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Zap className="h-3 w-3" />
                                    Why Apply
                                </div>
                                <p className="text-xs text-foreground/80 leading-relaxed pl-4.5">
                                    {summary.summary.value_prop}
                                </p>
                            </div>

                            {/* Footer: Confidence + Refresh */}
                            <div className="flex items-center justify-between pt-1 border-t border-border/30">
                                <div className="flex items-center gap-1.5">
                                    <Shield className="h-3 w-3 text-muted-foreground" />
                                    <span
                                        className={cn(
                                            "text-[10px] font-medium",
                                            confidencePercent >= 70
                                                ? "text-emerald-500"
                                                : confidencePercent >= 40
                                                    ? "text-amber-500"
                                                    : "text-red-500"
                                        )}
                                    >
                                        {confidencePercent}% confidence
                                    </span>
                                    {summary.processing_time_ms > 0 && (
                                        <span className="text-[10px] text-muted-foreground">
                                            · {summary.processing_time_ms}ms
                                        </span>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        fetchSummary(true)
                                    }}
                                    disabled={isLoading}
                                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                                >
                                    <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                                    Refresh
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/**
 * Summary badges for use in discovery/opportunity cards.
 * Renders inline badges for difficulty, deadline, and special tags.
 */
export function SummaryBadges({
    summary,
    className,
}: {
    summary: {
        difficulty_level?: string
        deadline_status?: string
        is_expired?: boolean
        value_prop?: string
    }
    className?: string
}) {
    if (!summary) return null

    const difficulty =
        summary.difficulty_level &&
        difficultyConfig[summary.difficulty_level as keyof typeof difficultyConfig]
    const deadline =
        summary.deadline_status &&
        deadlineConfig[summary.deadline_status as keyof typeof deadlineConfig]

    // Extract special badges from value_prop
    const valueProp = summary.value_prop?.toLowerCase() || ""
    const hasStipend = valueProp.includes("stipend") || valueProp.includes("paid") || valueProp.includes("salary")
    const hasMentorship = valueProp.includes("mentor")
    const hasCertificate = valueProp.includes("certificate") || valueProp.includes("credential")
    const isRolling = summary.deadline_status === "flexible"

    return (
        <div className={cn("flex flex-wrap gap-1", className)}>
            {difficulty && !summary.is_expired && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", difficulty.color)}>
                    {difficulty.icon} {difficulty.label}
                </Badge>
            )}
            {deadline && !summary.is_expired && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 gap-0.5", deadline.color)}>
                    {deadline.emoji} {deadline.label}
                </Badge>
            )}
            {summary.is_expired && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-red-500/10 text-red-500 border-red-500/20">
                    ❌ Expired
                </Badge>
            )}
            {hasStipend && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/20">
                    💰 Stipend
                </Badge>
            )}
            {hasMentorship && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-600 border-blue-500/20">
                    🎓 Mentorship
                </Badge>
            )}
            {hasCertificate && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-violet-500/10 text-violet-600 border-violet-500/20">
                    📜 Certificate
                </Badge>
            )}
            {isRolling && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-sky-500/10 text-sky-600 border-sky-500/20">
                    ⚡ Rolling Deadline
                </Badge>
            )}
        </div>
    )
}
