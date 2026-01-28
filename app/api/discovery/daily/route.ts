import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    // Security: Verify cron secret
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
        console.warn("[DailyDiscovery] CRON_SECRET not configured")
        return NextResponse.json(
            { error: "CRON_SECRET not configured" },
            { status: 500 }
        )
    }
    
    const providedSecret = authHeader?.replace("Bearer ", "")
    if (providedSecret !== cronSecret) {
        console.warn("[DailyDiscovery] Invalid cron secret")
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        )
    }
    
    const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8080"

    try {
        const response = await fetch(`${SCRAPER_API_URL}/api/v1/jobs/daily-crawl`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        })

        if (!response.ok) {
             return NextResponse.json(
                { error: "Scraper API error", details: await response.text() },
                { status: response.status }
            )
        }

        const data = await response.json()

        return NextResponse.json(data)
        
    } catch (error) {
        console.error("[DailyDiscovery] Error:", error)
        return NextResponse.json(
            { 
                error: "Failed to run daily discovery",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        )
    }
}

export async function GET(req: NextRequest) {
    return POST(req)
}
