"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { getCacheStats, clearOldCacheEntries } from "@/app/actions/discovery"

interface CacheStats {
    total_urls: number
    by_status: Record<string, number>
    pending_rechecks: number
    top_domains: Array<{ domain: string; count: number }>
}

export function CacheStatistics() {
    const [stats, setStats] = useState<CacheStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [clearing, setClearing] = useState(false)
    const [lastClearResult, setLastClearResult] = useState<string | null>(null)

    const loadStats = async () => {
        setLoading(true)
        const data = await getCacheStats()
        setStats(data)
        setLoading(false)
    }

    useEffect(() => {
        loadStats()
    }, [])

    const handleClearOld = async () => {
        if (!confirm("Clear cache entries older than 90 days?")) return

        setClearing(true)
        setLastClearResult(null)

        const result = await clearOldCacheEntries(90)

        if (result.success) {
            setLastClearResult(`Cleared ${result.deleted} old entries`)
            await loadStats()
        } else {
            setLastClearResult("Failed to clear old entries")
        }

        setClearing(false)
        setTimeout(() => setLastClearResult(null), 5000)
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "success": return <CheckCircle2 className="h-4 w-4 text-green-600" />
            case "failed": return <XCircle className="h-4 w-4 text-destructive" />
            case "expired": return <Clock className="h-4 w-4 text-orange-500" />
            default: return <div className="h-4 w-4 rounded-full bg-muted" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "success": return "text-green-600"
            case "failed": return "text-destructive"
            case "expired": return "text-orange-500"
            case "blocked": return "text-gray-500"
            case "invalid": return "text-gray-400"
            default: return "text-muted-foreground"
        }
    }

    if (loading) {
        return (
            <Card className="p-6 flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </Card>
        )
    }

    if (!stats) {
        return (
            <Card className="p-6">
                <p className="text-sm text-muted-foreground text-center">
                    Failed to load cache statistics
                </p>
            </Card>
        )
    }

    const successRate = stats.total_urls > 0
        ? ((stats.by_status.success || 0) / stats.total_urls * 100).toFixed(1)
        : "0.0"

    return (
        <Card className="p-6">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">URL Cache Statistics</h3>
                        <p className="text-sm text-muted-foreground">
                            Tracking {stats.total_urls.toLocaleString()} URLs
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadStats}
                            disabled={loading}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearOld}
                            disabled={clearing}
                        >
                            {clearing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Clear Old
                        </Button>
                    </div>
                </div>

                {lastClearResult && (
                    <div className="rounded-lg bg-muted p-3">
                        <p className="text-sm text-muted-foreground">{lastClearResult}</p>
                    </div>
                )}

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground mb-1">Total URLs</p>
                        <p className="text-2xl font-bold">{stats.total_urls.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
                        <p className="text-2xl font-bold text-green-600">{successRate}%</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground mb-1">Pending Rechecks</p>
                        <p className="text-2xl font-bold text-orange-500">
                            {stats.pending_rechecks.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Status Breakdown */}
                <div>
                    <h4 className="text-sm font-semibold mb-3">Status Breakdown</h4>
                    <div className="space-y-2">
                        {Object.entries(stats.by_status)
                            .sort(([, a], [, b]) => b - a)
                            .map(([status, count]) => {
                                const percentage = ((count / stats.total_urls) * 100).toFixed(1)
                                return (
                                    <div key={status} className="flex items-center gap-3">
                                        {getStatusIcon(status)}
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium capitalize">
                                                    {status.replace("_", " ")}
                                                </span>
                                                <span className={`text-sm ${getStatusColor(status)}`}>
                                                    {count.toLocaleString()} ({percentage}%)
                                                </span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${
                                                        status === "success"
                                                            ? "bg-green-600"
                                                            : status === "failed"
                                                            ? "bg-destructive"
                                                            : "bg-muted-foreground"
                                                    }`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                </div>

                {/* Top Domains */}
                {stats.top_domains.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-3">Top Domains</h4>
                        <div className="space-y-2">
                            {stats.top_domains.slice(0, 5).map((domain, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground font-mono">{domain.domain}</span>
                                    <span className="font-medium">{domain.count} URLs</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
