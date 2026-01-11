"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Sparkles, Globe, ArrowRight, CheckCircle2, Loader2, BrainCircuit } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface AiSearchOverlayProps {
    isOpen: boolean
    query: string
    onClose: () => void
    onComplete: () => void
}

interface SearchEvent {
    type: "plan" | "search" | "found" | "analyzing" | "extracted" | "complete" | "error"
    message?: string
    query?: string
    url?: string
    source?: string
    card?: any
    count?: number
}

export function AiSearchOverlay({ isOpen, query, onClose, onComplete }: AiSearchOverlayProps) {
    const [events, setEvents] = useState<SearchEvent[]>([])
    const [phase, setPhase] = useState<"planning" | "searching" | "analyzing" | "complete">("planning")
    const [foundUrls, setFoundUrls] = useState<{ url: string; source: string; status: "pending" | "scanning" | "extracted" }[]>([])
    const eventSourceRef = useRef<EventSource | null>(null)

    // Auto-scroll to bottom of logs
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen && query) {
            startSearch()
        }
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close()
            }
        }
    }, [isOpen, query])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [events])

    const startSearch = () => {
        setEvents([])
        setFoundUrls([])
        setPhase("planning")

        const es = new EventSource(`/api/discovery/stream?query=${encodeURIComponent(query)}`)
        eventSourceRef.current = es

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as SearchEvent
                setEvents((prev) => [...prev, data])

                switch (data.type) {
                    case "plan":
                        setPhase("planning")
                        break
                    case "search":
                        setPhase("searching")
                        break
                    case "found":
                        setFoundUrls((prev) => {
                            if (prev.some(u => u.url === data.url)) return prev
                            return [...prev, { url: data.url!, source: data.source!, status: "pending" }]
                        })
                        break
                    case "analyzing":
                        setPhase("analyzing")
                        setFoundUrls((prev) =>
                            prev.map(u => u.url === data.url ? { ...u, status: "scanning" } : u)
                        )
                        break
                    case "extracted":
                        setFoundUrls((prev) =>
                            prev.map(u => u.status === "scanning" ? { ...u, status: "extracted" } : u) // Simplistic match
                        )
                        break
                    case "complete":
                        setPhase("complete")
                        es.close()
                        setTimeout(() => {
                            onComplete()
                            onClose()
                        }, 3000)
                        break
                }
            } catch (e) {
                console.error("Parse error", e)
            }
        }

        es.onerror = () => {
            es.close()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-4xl bg-card border border-border shadow-2xl rounded-xl overflow-hidden h-[600px] flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${phase === 'complete' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
                            {phase === 'planning' && <BrainCircuit className="h-6 w-6 animate-pulse" />}
                            {phase === 'searching' && <Globe className="h-6 w-6 animate-spin-slow" />}
                            {phase === 'analyzing' && <Sparkles className="h-6 w-6 animate-pulse" />}
                            {phase === 'complete' && <CheckCircle2 className="h-6 w-6" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">
                                {phase === 'planning' && "Planning Discovery Strategy..."}
                                {phase === 'searching' && "Scanning the Web..."}
                                {phase === 'analyzing' && "Extracting Opportunities..."}
                                {phase === 'complete' && "Discovery Complete!"}
                            </h2>
                            <p className="text-sm text-muted-foreground">Target: {query}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>Minimize</Button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* Left: Logic Feed */}
                    <div className="md:w-1/3 bg-muted/10 border-r border-border p-4 flex flex-col gap-2 overflow-y-auto font-mono text-sm" ref={scrollRef}>
                        <AnimatePresence>
                            {events.map((evt, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex gap-2 text-xs"
                                >
                                    <span className="text-muted-foreground w-16 shrink-0 text-[10px] uppercase tracking-wider">{evt.type}</span>
                                    <span className={evt.type === 'error' ? 'text-red-500' : 'text-foreground'}>
                                        {evt.message || evt.query || (evt.url ? `Found: ${evt.source}` : '') || (evt.card ? `Extracted: ${evt.card.title}` : '')}
                                    </span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Right: Visualizer */}
                    <div className="flex-1 p-6 relative bg-gradient-to-br from-background to-muted/20">
                        {/* Fan-out Visualization */}
                        <div className="grid grid-cols-2 gap-4">
                            <AnimatePresence>
                                {foundUrls.map((item, i) => (
                                    <motion.div
                                        key={item.url}
                                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`
                      relative overflow-hidden rounded-lg border p-4 transition-colors
                      ${item.status === 'scanning' ? 'border-primary shadow-lg shadow-primary/10 bg-card' : ''}
                      ${item.status === 'extracted' ? 'border-green-500 bg-green-500/5' : 'border-border bg-card/50'}
                    `}
                                    >
                                        {/* Scanning Beam */}
                                        {item.status === 'scanning' && (
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent w-full h-full -skew-x-12"
                                                animate={{ x: ['-100%', '100%'] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                            />
                                        )}

                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className={`
                        p-1.5 rounded-md shrink-0 
                        ${item.status === 'extracted' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}
                      `}>
                                                {item.status === 'extracted' ? <CheckCircle2 className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium truncate text-sm">{item.source}</p>
                                                <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {foundUrls.length === 0 && (
                            <div className="h-full flex items-center justify-center text-muted-foreground/30">
                                <BrainCircuit className="h-32 w-32 animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
