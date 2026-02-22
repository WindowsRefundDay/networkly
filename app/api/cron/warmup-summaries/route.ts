import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/cron/warmup-summaries
 *
 * Cron job to pre-generate summaries for popular opportunities.
 * Runs every 6 hours (configurable via Vercel Cron or equivalent).
 *
 * Strategy:
 * 1. Find opportunities with high click counts but no summary
 * 2. Call the scraper's /api/v1/summarize for each
 * 3. The scraper handles caching — subsequent user requests are instant
 *
 * Security: Protected by CRON_SECRET header.
 */
export async function POST(req: NextRequest) {
    try {
        // Auth: verify cron secret
        const authHeader = req.headers.get("authorization")
        const cronSecret = process.env.CRON_SECRET

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = createAdminClient()
        const SCRAPER_API_URL = process.env.SCRAPER_API_URL
        const API_TOKEN = process.env.DISCOVERY_API_TOKEN

        if (!SCRAPER_API_URL) {
            return NextResponse.json(
                { error: "Scraper service not configured" },
                { status: 503 }
            )
        }

        // Find popular unsummarized opportunities (click_count > 3, no summary)
        const { data: opportunities, error: dbError } = await supabase
            .from("opportunities")
            .select("id, url, source_url, click_count")
            .is("summary_json", null)
            .eq("is_active", true)
            .gt("click_count", 3)
            .order("click_count", { ascending: false })
            .limit(25) // Process max 25 per run to avoid rate limits

        if (dbError) {
            console.error("[Warmup] DB error:", dbError)
            return NextResponse.json({ error: "Database error" }, { status: 500 })
        }

        if (!opportunities || opportunities.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No opportunities need warming up",
                processed: 0,
            })
        }

        console.log(`[Warmup] Found ${opportunities.length} opportunities to summarize`)

        const results: Array<{ id: string; success: boolean; cached: boolean; error?: string }> = []
        let successCount = 0
        let errorCount = 0

        // Process sequentially to avoid overwhelming the API
        for (const opp of opportunities) {
            const url = opp.url || opp.source_url
            if (!url) {
                results.push({ id: opp.id, success: false, cached: false, error: "No URL" })
                errorCount++
                continue
            }

            try {
                const res = await fetch(`${SCRAPER_API_URL}/api/v1/summarize`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
                    },
                    body: JSON.stringify({
                        opportunity_id: opp.id,
                        url: url,
                        force_refresh: false,
                    }),
                    signal: AbortSignal.timeout(30000), // 30s per opportunity
                })

                if (res.ok) {
                    const data = await res.json()
                    results.push({
                        id: opp.id,
                        success: data.success,
                        cached: data.cached || false,
                    })
                    if (data.success) successCount++
                    else errorCount++
                } else {
                    results.push({
                        id: opp.id,
                        success: false,
                        cached: false,
                        error: `HTTP ${res.status}`,
                    })
                    errorCount++
                }
            } catch (err: any) {
                results.push({
                    id: opp.id,
                    success: false,
                    cached: false,
                    error: err.message || "Request failed",
                })
                errorCount++
            }

            // Small delay between requests to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 2000))
        }

        console.log(`[Warmup] Complete: ${successCount} success, ${errorCount} errors`)

        return NextResponse.json({
            success: true,
            processed: opportunities.length,
            successCount,
            errorCount,
            results,
        })
    } catch (error: any) {
        console.error("[Warmup] Fatal error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
