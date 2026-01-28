"use server";

interface DiscoveryResult {
    success: boolean;
    message: string;
    newOpportunities?: number;
}

interface BatchDiscoveryOptions {
    sources?: string[];
    focusAreas?: string[];
    limit?: number;
}

interface CacheStats {
    total_urls: number;
    by_status: Record<string, number>;
    pending_rechecks: number;
    top_domains: Array<{ domain: string; count: number }>;
}

export async function triggerDiscovery(
    query: string
): Promise<DiscoveryResult> {
    const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8080";
    const API_TOKEN = process.env.DISCOVERY_API_TOKEN;

    // Sanitize query to prevent command injection
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s]/g, "").slice(0, 100);

    if (!sanitizedQuery || sanitizedQuery.length < 3) {
        return {
            success: false,
            message: "Query too short. Please provide at least 3 characters.",
        };
    }

    try {
        const response = await fetch(`${SCRAPER_API_URL}/api/v1/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(API_TOKEN ? { "Authorization": `Bearer ${API_TOKEN}` } : {})
            },
            body: JSON.stringify({
                query: sanitizedQuery,
                limit: 10
            }),
            // Set a reasonable timeout for serverless functions
            signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) {
            console.error(`Scraper API error: ${response.status} ${response.statusText}`);
            return {
                success: false,
                message: "Discovery service unavailable.",
            };
        }

        const data = await response.json();

        return {
            success: true,
            message: data.count > 0
                ? `Found ${data.count} opportunities!`
                : "Search complete. No new opportunities found.",
            newOpportunities: data.count,
        };

    } catch (error) {
        console.error("Discovery error:", error);
        return {
            success: false,
            message: "Discovery failed. Please try again later.",
        };
    }
}

/**
 * Trigger batch discovery using multiple sources.
 */
export async function triggerBatchDiscovery(
    options: BatchDiscoveryOptions = {}
): Promise<DiscoveryResult> {
    const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8080";

    try {
        // Trigger the daily crawl endpoint as a proxy for batch discovery
        // Note: The main scraper's daily crawl might ignore options for now
        const response = await fetch(`${SCRAPER_API_URL}/api/v1/jobs/daily-crawl`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            return {
                success: false,
                message: "Batch discovery failed to start.",
            };
        }

        return {
            success: true,
            message: "Batch discovery started in background.",
            newOpportunities: 0, // Async process
        };
    } catch (e) {
        console.error("Batch discovery error:", e);
        return {
            success: false,
            message: "Failed to trigger batch discovery.",
        };
    }
}

/**
 * Get URL cache statistics.
 * Stubbed as main scraper manages state differently.
 */
export async function getCacheStats(): Promise<CacheStats | null> {
    return {
        total_urls: 0,
        by_status: {},
        pending_rechecks: 0,
        top_domains: []
    };
}

/**
 * Clear old cache entries.
 * Stubbed.
 */
export async function clearOldCacheEntries(days: number = 90): Promise<{ success: boolean; deleted: number }> {
    return { success: true, deleted: 0 };
}
