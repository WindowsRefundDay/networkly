"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Globe, CheckCircle2, Loader2, Sparkles, ExternalLink } from "lucide-react"

interface FoundSource {
    url: string
    source: string
    status: "scanning" | "extracted" | "done"
}

interface ExtractedCard {
    title: string
    organization: string
    type: string
    location?: string
}

interface SearchEvent {
    type: "plan" | "search" | "found" | "analyzing" | "extracted" | "complete" | "error" | "done"
    message?: string
    query?: string
    url?: string
    source?: string
    card?: ExtractedCard
    count?: number
}

interface InlineDiscoveryProps {
    isActive: boolean
    query: string
    onComplete: () => void
    onNewOpportunity?: (card: ExtractedCard) => void
}

export function InlineDiscovery({ isActive, query, onComplete, onNewOpportunity }: InlineDiscoveryProps) {
    const [phase, setPhase] = useState<"idle" | "planning" | "searching" | "analyzing" | "complete">("idle")
    const [sources, setSources] = useState<FoundSource[]>([])
    const [statusMessage, setStatusMessage] = useState("")
    const [extractedCount, setExtractedCount] = useState(0)
    const eventSourceRef = useRef<EventSource | null>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Cleanup function for timeout and event source
    const cleanup = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
        }
    }

    useEffect(() => {
        if (isActive && query) {
            startSearch()
        }
        return cleanup
    }, [isActive, query])

    const DISCOVERY_TIMEOUT_MS = 90_000 // 90 seconds max

    const startSearch = () => {
        cleanup() // Clear any previous state
        setSources([])
        setPhase("planning")
        setStatusMessage("Analyzing your request...")
        setExtractedCount(0)

        const es = new EventSource(`/api/discovery/stream?query=${encodeURIComponent(query)}`)

        // Set up timeout - auto-complete after 90 seconds
        timeoutRef.current = setTimeout(() => {
            console.log("[Discovery] Timeout reached, completing search")
            es.close()
            setPhase("complete")
            setStatusMessage("Search completed (timeout)")
            setSources((prev) => prev.map(s => ({ ...s, status: "done" })))
            setTimeout(() => onComplete(), 1000)
        }, DISCOVERY_TIMEOUT_MS)
        eventSourceRef.current = es

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as SearchEvent

                switch (data.type) {
                    case "plan":
                        setPhase("planning")
                        setStatusMessage(data.message || "Planning search strategy...")
                        break
                    case "search":
                        setPhase("searching")
                        setStatusMessage(`Searching: ${data.query || query}`)
                        break
                    case "found":
                        setSources((prev) => {
                            if (prev.some(s => s.url === data.url)) return prev
                            return [...prev, {
                                url: data.url!,
                                source: data.source || getDomain(data.url!),
                                status: "scanning"
                            }]
                        })
                        break
                    case "analyzing":
                        setPhase("analyzing")
                        setSources((prev) =>
                            prev.map(s => s.url === data.url ? { ...s, status: "scanning" } : s)
                        )
                        break
                    case "extracted":
                        setExtractedCount(c => c + 1)
                        setSources((prev) =>
                            prev.map(s => s.status === "scanning" ? { ...s, status: "extracted" } : s)
                        )
                        if (data.card && onNewOpportunity) {
                            onNewOpportunity(data.card)
                        }
                        break
                    case "complete":
                    case "done":
                        cleanup() // Clear timeout and close connection
                        setPhase("complete")
                        setStatusMessage(
                            extractedCount > 0
                                ? `Found ${data.count || extractedCount} new opportunities!`
                                : "Search complete"
                        )
                        // Mark all as done
                        setSources((prev) => prev.map(s => ({ ...s, status: "done" })))
                        setTimeout(() => {
                            onComplete()
                        }, 2000)
                        break
                    case "error":
                        setStatusMessage(data.message || "An error occurred")
                        break
                }
            } catch (e) {
                console.error("Parse error", e)
            }
        }

        es.onerror = (error) => {
            // Only log if it's not a normal close
            if (es.readyState !== EventSource.CLOSED) {
                console.error("[Discovery] EventSource error:", error)
            }
            cleanup()
            // Only complete if we haven't already
            if (phase !== "complete") {
                setPhase("complete")
                setStatusMessage(extractedCount > 0 ? `Found ${extractedCount} opportunities` : "Search ended")
                setSources((prev) => prev.map(s => ({ ...s, status: "done" })))
                setTimeout(() => onComplete(), 500)
            }
        }
    }

    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace("www.", "")
        } catch {
            return url
        }
    }

    if (!isActive && sources.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
        >
            <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-4 mb-4">
                {/* Status Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className={`
                        p-2 rounded-full shrink-0 transition-colors
                        ${phase === "complete" ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"}
                    `}>
                        {phase === "planning" && <Sparkles className="h-5 w-5 animate-pulse" />}
                        {phase === "searching" && <Globe className="h-5 w-5 animate-spin" />}
                        {phase === "analyzing" && <Loader2 className="h-5 w-5 animate-spin" />}
                        {phase === "complete" && <CheckCircle2 className="h-5 w-5" />}
                        {phase === "idle" && <Globe className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                            {phase === "planning" && "Planning discovery..."}
                            {phase === "searching" && "Scanning the web..."}
                            {phase === "analyzing" && "Extracting opportunities..."}
                            {phase === "complete" && "Discovery complete!"}
                            {phase === "idle" && "Ready to search"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{statusMessage}</p>
                    </div>
                    {extractedCount > 0 && (
                        <div className="shrink-0 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                            +{extractedCount} found
                        </div>
                    )}
                </div>

                {/* Source Pills - Copilot Style */}
                <div className="flex flex-wrap gap-2">
                    <AnimatePresence mode="popLayout">
                        {sources.map((source, i) => (
                            <motion.div
                                key={source.url}
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                    delay: i * 0.05
                                }}
                                className={`
                                    relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                                    border transition-all duration-300 overflow-hidden
                                    ${source.status === "scanning"
                                        ? "border-primary/50 bg-primary/5 text-primary"
                                        : source.status === "extracted"
                                            ? "border-green-500/50 bg-green-500/5 text-green-600"
                                            : "border-border bg-muted/50 text-muted-foreground"
                                    }
                                `}
                            >
                                {/* Scanning shimmer effect */}
                                {source.status === "scanning" && (
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                                        animate={{ x: ["-100%", "100%"] }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                )}

                                <span className="relative z-10 flex items-center gap-1.5">
                                    {source.status === "scanning" && (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    )}
                                    {source.status === "extracted" && (
                                        <CheckCircle2 className="h-3 w-3" />
                                    )}
                                    {source.status === "done" && (
                                        <Globe className="h-3 w-3" />
                                    )}
                                    <span className="max-w-[150px] truncate">{source.source}</span>
                                </span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Empty state placeholder */}
                {sources.length === 0 && phase === "planning" && (
                    <div className="flex gap-2">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                className="h-7 w-24 rounded-full bg-muted"
                            />
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    )
}
