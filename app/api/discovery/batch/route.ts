import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            sources = ["all"],
            focusAreas = ["STEM competitions", "internships", "summer programs", "scholarships"],
            limit = 50,
        } = body

        const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8080"
        
        // Proxy to Scraper API
        const response = await fetch(`${SCRAPER_API_URL}/api/v1/jobs/batch`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Pass auth token if needed
            },
            body: JSON.stringify({
                sources,
                focus_areas: focusAreas,
                limit
            })
        })

        if (!response.ok) {
            return NextResponse.json(
                { error: "Scraper API error", details: await response.text() },
                { status: response.status }
            )
        }

        // Return the stream from the scraper
        return new Response(response.body, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        })

    } catch (error) {
        console.error("[Batch Discovery API Error]", error)
        return NextResponse.json(
            { error: "Failed to start batch discovery" },
            { status: 500 }
        )
    }
}
