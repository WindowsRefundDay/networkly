"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, Search, Database, Rss, Map, RefreshCw, CheckCircle2, XCircle } from "lucide-react"

interface BatchDiscoveryPanelProps {
    onComplete?: () => void
}

interface DiscoveryEvent {
    type: string
    phase?: string
    message?: string
    count?: number
    success?: boolean
}

export function BatchDiscoveryPanel({ onComplete }: BatchDiscoveryPanelProps) {
    const [isRunning, setIsRunning] = useState(false)
    const [selectedSources, setSelectedSources] = useState<string[]>(["all"])
    const [focusAreas, setFocusAreas] = useState("STEM competitions, internships, summer programs, scholarships")
    const [limit, setLimit] = useState(50)
    const [events, setEvents] = useState<DiscoveryEvent[]>([])
    const [currentPhase, setCurrentPhase] = useState<string>("")
    const [successCount, setSuccessCount] = useState(0)

    const sources = [
        { id: "curated", label: "Curated Sources", icon: Database, desc: "Verified high-quality sites" },
        { id: "sitemaps", label: "Sitemaps", icon: Map, desc: "Crawl trusted domain sitemaps" },
        { id: "rss", label: "RSS Feeds", icon: Rss, desc: "Monitor opportunity feeds" },
        { id: "search", label: "AI Search", icon: Search, desc: "Search engine discovery" },
        { id: "recheck", label: "Recheck Queue", icon: RefreshCw, desc: "Re-verify expired opportunities" },
    ]

    const handleSourceToggle = (sourceId: string) => {
        if (sourceId === "all") {
            setSelectedSources(["all"])
        } else {
            const newSources = selectedSources.filter(s => s !== "all")
            if (newSources.includes(sourceId)) {
                const filtered = newSources.filter(s => s !== sourceId)
                setSelectedSources(filtered.length > 0 ? filtered : ["all"])
            } else {
                setSelectedSources([...newSources, sourceId])
            }
        }
    }

    const startBatchDiscovery = async () => {
        setIsRunning(true)
        setEvents([])
        setCurrentPhase("")
        setSuccessCount(0)

        try {
            const focusAreasArray = focusAreas
                .split(",")
                .map(s => s.trim())
                .filter(Boolean)

            const response = await fetch("/api/discovery/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sources: selectedSources,
                    focusAreas: focusAreasArray,
                    limit,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to start batch discovery")
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) return

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split("\n")

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6)) as DiscoveryEvent
                            setEvents(prev => [...prev, data])

                            if (data.type === "status" && data.phase) {
                                setCurrentPhase(data.phase)
                            }

                            if (data.type === "success" && data.count !== undefined) {
                                setSuccessCount(prev => prev + (data.count ?? 0))
                            }

                            if (data.type === "complete") {
                                setIsRunning(false)
                                if (onComplete) {
                                    setTimeout(onComplete, 2000)
                                }
                            }
                        } catch (e) {
                            console.error("Parse error:", e)
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Batch discovery error:", error)
            setEvents(prev => [
                ...prev,
                { type: "error", message: "Failed to run batch discovery" },
            ])
        } finally {
            setIsRunning(false)
        }
    }

    const getPhaseIcon = (phase: string) => {
        switch (phase) {
            case "curated": return Database
            case "sitemaps": return Map
            case "rss": return Rss
            case "search": return Search
            case "recheck": return RefreshCw
            case "complete": return CheckCircle2
            default: return Search
        }
    }

    const isAllSelected = selectedSources.includes("all")

    return (
        <GlassCard className="p-6">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Batch Discovery</h3>
                    <p className="text-sm text-muted-foreground">
                        Run comprehensive discovery across multiple sources to find new opportunities.
                    </p>
                </div>

                {/* Source Selection */}
                <div>
                    <Label className="text-base mb-3 block">Select Sources</Label>
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="source-all"
                                checked={isAllSelected}
                                onCheckedChange={() => handleSourceToggle("all")}
                                disabled={isRunning}
                            />
                            <Label htmlFor="source-all" className="font-medium cursor-pointer">
                                All Sources
                            </Label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                            {sources.map((source) => {
                                const Icon = source.icon
                                return (
                                    <div key={source.id} className="flex items-start space-x-2">
                                        <Checkbox
                                            id={`source-${source.id}`}
                                            checked={isAllSelected || selectedSources.includes(source.id)}
                                            onCheckedChange={() => handleSourceToggle(source.id)}
                                            disabled={isRunning || isAllSelected}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <Label
                                                htmlFor={`source-${source.id}`}
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                <Icon className="h-4 w-4 flex-shrink-0" />
                                                <span className="font-medium">{source.label}</span>
                                            </Label>
                                            <p className="text-xs text-muted-foreground">{source.desc}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Focus Areas */}
                <div>
                    <Label htmlFor="focus-areas" className="text-base mb-2 block">
                        Focus Areas (comma-separated)
                    </Label>
                    <Input
                        id="focus-areas"
                        value={focusAreas}
                        onChange={(e) => setFocusAreas(e.target.value)}
                        disabled={isRunning}
                        placeholder="STEM competitions, internships, scholarships"
                    />
                </div>

                {/* Limit */}
                <div>
                    <Label htmlFor="limit" className="text-base mb-2 block">
                        URLs per Source (Max)
                    </Label>
                    <Input
                        id="limit"
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                        disabled={isRunning}
                        min={10}
                        max={200}
                    />
                </div>

                {/* Action Button */}
                <Button
                    onClick={startBatchDiscovery}
                    disabled={isRunning}
                    className="w-full"
                    size="lg"
                >
                    {isRunning ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running Discovery...
                        </>
                    ) : (
                        <>
                            <Search className="mr-2 h-4 w-4" />
                            Start Batch Discovery
                        </>
                    )}
                </Button>

                {/* Progress Display */}
                {isRunning && currentPhase && (
                    <div className="rounded-lg border p-4 bg-muted/50">
                        <div className="flex items-center gap-2 mb-2">
                            {(() => {
                                const Icon = getPhaseIcon(currentPhase)
                                return <Icon className="h-5 w-5 animate-pulse" />
                            })()}
                            <span className="font-medium capitalize">{currentPhase.replace("_", " ")}</span>
                        </div>
                        {successCount > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Found {successCount} opportunities so far...
                            </p>
                        )}
                    </div>
                )}

                {/* Event Log */}
                {events.length > 0 && (
                    <div className="rounded-lg border p-4 max-h-64 overflow-y-auto space-y-1">
                        {events.slice(-10).map((event, i) => (
                            <div key={i} className="text-xs font-mono flex items-start gap-2">
                                {event.type === "error" && <XCircle className="h-3 w-3 text-destructive mt-0.5" />}
                                {event.type === "success" && <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5" />}
                                <span className="text-muted-foreground">{event.message || JSON.stringify(event)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </GlassCard>
    )
}
