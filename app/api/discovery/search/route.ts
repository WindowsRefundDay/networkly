import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectPivotLocally } from "@/lib/discovery/intent-detector";

/**
 * GET /api/discovery/search?query=...&limit=...&threshold=...&userProfileId=...&personalizationWeight=...
 *
 * Fast database search for opportunities with intent detection.
 *
 * Strategy:
 * 1. Detect search intent (pivot vs explore) based on user profile
 * 2. Try the backend's semantic search (vector similarity) with a short timeout
 * 3. If the backend is slow (common on cold starts), fall back to a direct
 *    Supabase text search so the user always gets instant results
 * 4. Apply ranking based on personalization weight
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const limit = parseInt(searchParams.get("limit") || "20");
    const threshold = parseFloat(searchParams.get("threshold") || "0.6");
    const userProfileId = searchParams.get("userProfileId");
    let personalizationWeight = parseFloat(searchParams.get("personalizationWeight") || "1.0");

    if (!query) {
        return NextResponse.json({ results: [], count: 0, error: "Query required" }, { status: 400 });
    }

    // Detect intent if user profile is provided and weight not explicitly set
    if (userProfileId && searchParams.get("personalizationWeight") === null) {
        try {
            const supabase = createAdminClient();
            const { data: profile } = await supabase
                .from("user_profiles")
                .select("interests")
                .eq("user_id", userProfileId)
                .single();

            if (profile?.interests && Array.isArray(profile.interests)) {
                const intentResult = detectPivotLocally(query, profile.interests);
                personalizationWeight = intentResult.personalizationWeight;

                console.log(`[Discovery] Intent: ${intentResult.intent}, confidence: ${intentResult.confidence.toFixed(2)}, weight: ${personalizationWeight}, matched: ${intentResult.matchedInterests.join(', ') || 'none'}`);
            }
        } catch (error) {
            console.error("[Discovery Search] Profile lookup failed, defaulting to explore:", error);
            personalizationWeight = 0.9; // Default to personalized on error
        }
    }

    // Clamp personalization weight to valid range
    personalizationWeight = Math.max(0.0, Math.min(1.0, personalizationWeight));

    // Try backend semantic search with a short timeout
    const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8080";
    const API_TOKEN = process.env.DISCOVERY_API_TOKEN;

    try {
        const backendResult = await fetchBackendSearch(SCRAPER_API_URL, API_TOKEN, query, limit, threshold, personalizationWeight);
        if (backendResult && backendResult.results && backendResult.results.length > 0) {
            return NextResponse.json(backendResult);
        }
    } catch (err: any) {
        console.log(`[Discovery Search] Backend unavailable (${err.message}), falling back to Supabase`);
    }

    // Fallback: direct Supabase text search
    try {
        const results = await directSupabaseSearch(query, limit, personalizationWeight);
        return NextResponse.json({ results, count: results.length });
    } catch (error: any) {
        console.error("[Discovery Search] Supabase fallback error:", error.message);
        return NextResponse.json({ results: [], count: 0 }, { status: 200 });
    }
}

async function fetchBackendSearch(
    baseUrl: string,
    token: string | undefined,
    query: string,
    limit: number,
    threshold: number,
    personalizationWeight: number
) {
    const response = await fetch(`${baseUrl}/api/v1/search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, limit, threshold, personalization_weight: personalizationWeight }),
        signal: AbortSignal.timeout(8000), // 8s — fail fast on cold starts
    });

    if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
    }

    return response.json();
}

async function directSupabaseSearch(
    query: string,
    limit: number,
    personalizationWeight: number
): Promise<Array<{
    id: string;
    title: string;
    description: string;
    url: string;
    similarity: number;
    organization?: string;
    category?: string;
    locationType?: string;
    opportunityType?: string;
}>> {
    const supabase = createAdminClient();

    // Split query into keywords for broader matching
    const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 2);

    // Build OR conditions for each keyword across title, company, description, category
    const orConditions = keywords
        .flatMap((kw) => [
            `title.ilike.%${kw}%`,
            `company.ilike.%${kw}%`,
            `category.ilike.%${kw}%`,
            `description.ilike.%${kw}%`,
        ])
        .join(",");

    // Fetch more than needed so we can rank and pick the best
    const fetchLimit = Math.max(limit * 3, 60);

    const { data, error } = await supabase
        .from("opportunities")
        .select("id, title, description, company, url, source_url, category, location_type, type")
        .eq("is_active", true)
        .neq("title", "Unknown")
        .neq("title", "")
        .or(orConditions)
        .order("created_at", { ascending: false })
        .limit(fetchLimit);

    if (error) {
        console.error("[Discovery Search] Supabase query error:", error);
        throw error;
    }

    if (!data) return [];

    // Score each result by keyword match density
    // Title matches are worth more than description matches
    const scored = data.map((row) => {
        const titleLower = (row.title || "").toLowerCase();
        const companyLower = (row.company || "").toLowerCase();
        const descLower = (row.description || "").toLowerCase();
        const catLower = (row.category || "").toLowerCase();

        let score = 0;
        let titleMatches = 0;

        for (const kw of keywords) {
            if (titleLower.includes(kw)) { score += 3; titleMatches++; }
            if (companyLower.includes(kw)) score += 2;
            if (catLower.includes(kw)) score += 1.5;
            if (descLower.includes(kw)) score += 0.5;
        }

        // Bonus: exact phrase match in title
        if (titleLower.includes(query.toLowerCase())) score += 5;

        // Bonus: all keywords matched in title
        if (keywords.length > 1 && titleMatches === keywords.length) score += 3;

        // Normalize to 0-1 range for similarity
        const maxPossible = keywords.length * 7 + 8; // max per keyword + bonuses
        const similarity = Math.min(0.95, 0.5 + (score / maxPossible) * 0.45);

        return { row, score, similarity };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Deduplicate by title and return top results
    const seen = new Set<string>();
    const results = [];

    for (const { row, similarity } of scored) {
        const titleKey = row.title.trim().toLowerCase();
        if (seen.has(titleKey)) continue;
        seen.add(titleKey);

        results.push({
            id: row.id,
            title: row.title,
            description: row.description || "",
            url: row.url || row.source_url || "",
            similarity,
            organization: row.company || "",
            category: row.category || "",
            locationType: row.location_type || "",
            opportunityType: row.type || "",
        });

        if (results.length >= limit) break;
    }

    return results;
}
