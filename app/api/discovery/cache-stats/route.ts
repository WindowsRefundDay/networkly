/**
 * API route for retrieving URL cache statistics.
 * Stubbed implementation - cache is now managed by the Cloud Run scraper.
 */

import { NextResponse } from "next/server"

export async function GET(): Promise<NextResponse> {
    // Cache statistics are now managed internally by the Cloud Run scraper.
    // Return a stubbed response for backwards compatibility.
    return NextResponse.json({
        total_urls: 0,
        by_status: {},
        pending_rechecks: 0,
        top_domains: [],
        message: "Cache is managed by Cloud Run scraper service"
    })
}
