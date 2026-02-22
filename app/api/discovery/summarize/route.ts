import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/server"
import { checkRateLimit, createRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit"

/**
 * POST /api/discovery/summarize
 *
 * Secure proxy for JIT summarization.
 *
 * Flow:
 * 1. Validate Supabase session (authenticated users only)
 * 2. Per-user rate limit (5 summaries per 60 seconds)
 * 3. Forward to FastAPI /api/v1/summarize with DISCOVERY_API_TOKEN
 * 4. Return structured summary to frontend
 *
 * Security: SCRAPER_API_URL and DISCOVERY_API_TOKEN never reach the browser.
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Auth check — Supabase session
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        // 2. Per-user rate limit (5 summaries per 60 seconds)
        const rateLimitKey = createRateLimitKey("SUMMARIZE", user.id)
        const { success: withinLimit, remaining, reset, limit } = await checkRateLimit(
            rateLimitKey,
            RATE_LIMITS.SUMMARIZE.limit,
            RATE_LIMITS.SUMMARIZE.windowSeconds
        )

        if (!withinLimit) {
            return NextResponse.json(
                { error: "Too many requests. Try again in a minute." },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": limit.toString(),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": reset.toString(),
                    },
                }
            )
        }

        // 3. Parse request body
        const body = await req.json()
        const { opportunityId, url, forceRefresh } = body

        if (!url || !opportunityId) {
            return NextResponse.json(
                { error: "Missing required fields: opportunityId and url" },
                { status: 400 }
            )
        }

        // 4. Proxy to FastAPI backend
        const SCRAPER_API_URL = process.env.SCRAPER_API_URL
        const API_TOKEN = process.env.DISCOVERY_API_TOKEN

        if (!SCRAPER_API_URL) {
            return NextResponse.json(
                { error: "Scraper service not configured" },
                { status: 503 }
            )
        }

        const backendRes = await fetch(`${SCRAPER_API_URL}/api/v1/summarize`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
            },
            body: JSON.stringify({
                opportunity_id: opportunityId,
                url: url,
                force_refresh: forceRefresh || false,
            }),
            signal: AbortSignal.timeout(20000), // 20s timeout — summarization can take time
        })

        if (!backendRes.ok) {
            const errorText = await backendRes.text().catch(() => "Unknown error")
            console.error("[Summarize Proxy] Backend error:", backendRes.status, errorText)
            return NextResponse.json(
                { error: "Summarization service unavailable", details: errorText },
                { status: backendRes.status }
            )
        }

        const data = await backendRes.json()

        return NextResponse.json(data, {
            headers: {
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString(),
            },
        })
    } catch (error: any) {
        // Handle timeout specifically
        if (error.name === "TimeoutError" || error.name === "AbortError") {
            return NextResponse.json(
                { error: "Summarization timed out. The page may be slow to load." },
                { status: 504 }
            )
        }

        console.error("[Summarize Proxy] Error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
