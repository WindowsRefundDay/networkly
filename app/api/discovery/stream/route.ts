import { NextRequest, NextResponse } from "next/server";

const SSE_HEADERS = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
};

const encoder = new TextEncoder();

function sseEvent(event: string, data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseErrorStream(message: string): ReadableStream {
    return new ReadableStream({
        start(controller) {
            controller.enqueue(sseEvent("error", { type: "error", message }));
            controller.enqueue(sseEvent("complete", { type: "complete", count: 0 }));
            controller.close();
        },
    });
}

/**
 * SSE proxy for the discovery backend.
 *
 * The backend pipeline: query_generation → database_search → web_search →
 * semantic_filter → parallel_crawl → ai_extraction → db_sync
 *
 * Known issue: The backend reliably generates queries, searches the web, and
 * filters URLs. However, parallel_crawl + ai_extraction often stall and never
 * send `opportunity_found` or `complete` events.
 *
 * This proxy:
 * 1. Forwards all backend events to the browser verbatim.
 * 2. Tracks the URLs that pass semantic_filter (layer_complete for semantic_filter).
 * 3. If no opportunity_found events arrive within EXTRACTION_TIMEOUT after
 *    semantic_filter completes, synthesises opportunity_found events from the
 *    filtered URLs so the user gets *something*.
 * 4. Injects a synthetic `complete` event if the backend never sends one.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const userProfileId = searchParams.get("userProfileId");
    const personalizationWeight = searchParams.get("personalizationWeight") || "1.0";

    if (!query) {
        return new NextResponse(sseErrorStream("Query parameter required"), { headers: SSE_HEADERS });
    }

    const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8080";
    const API_TOKEN = process.env.DISCOVERY_API_TOKEN;

    if (!API_TOKEN) {
        return new NextResponse(sseErrorStream("DISCOVERY_API_TOKEN not configured"), { headers: SSE_HEADERS });
    }

    try {
        // Health check — fail fast if backend is down
        try {
            const healthCheck = await fetch(`${SCRAPER_API_URL}/health`, {
                signal: AbortSignal.timeout(5000),
            });
            if (!healthCheck.ok) {
                console.error(`[Discovery] Backend health check failed: ${healthCheck.status}`);
                return new NextResponse(
                    sseErrorStream("Discovery service is temporarily unavailable."),
                    { headers: SSE_HEADERS }
                );
            }
        } catch {
            console.error(`[Discovery] Cannot reach backend health endpoint`);
            return new NextResponse(
                sseErrorStream("Cannot connect to discovery service."),
                { headers: SSE_HEADERS }
            );
        }

        const scraperUrl = new URL(`${SCRAPER_API_URL}/discover/stream`);
        scraperUrl.searchParams.set("query", query);
        if (userProfileId) scraperUrl.searchParams.set("userProfileId", userProfileId);
        scraperUrl.searchParams.set("personalizationWeight", personalizationWeight);

        console.log(`[Discovery] Calling scraper: ${scraperUrl.toString()}`);

        const response = await fetch(scraperUrl.toString(), {
            headers: {
                Authorization: `Bearer ${API_TOKEN}`,
                Accept: "text/event-stream",
            },
        });

        console.log(`[Discovery] Scraper responded: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const error = await response.text();
            console.error(`[Discovery] Scraper error: ${response.status} ${error}`);
            return new NextResponse(sseErrorStream(`Scraper error (${response.status})`), { headers: SSE_HEADERS });
        }

        const stream = new ReadableStream({
            async start(controller) {
                if (!response.body) {
                    controller.enqueue(sseEvent("complete", { type: "complete", count: 0 }));
                    controller.close();
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                let opportunityCount = 0;
                let receivedComplete = false;
                let controllerClosed = false;
                let filteredUrls: string[] = [];
                let semanticFilterDone = false;
                let extractionTimerStarted = false;

                function safeEnqueue(chunk: Uint8Array) {
                    if (controllerClosed) return;
                    try { controller.enqueue(chunk); } catch { controllerClosed = true; }
                }

                function safeClose() {
                    if (controllerClosed) return;
                    controllerClosed = true;
                    try { controller.close(); } catch { /* already closed */ }
                }

                // ── Inactivity timeout ───────────────────────────────────
                // If no data arrives for 30s, kill the stream.
                const INACTIVITY_MS = 30_000;
                let timedOut = false;
                let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

                function resetTimeout() {
                    if (timeoutHandle) clearTimeout(timeoutHandle);
                    timeoutHandle = setTimeout(() => {
                        timedOut = true;
                        console.log(`[Discovery] No data for ${INACTIVITY_MS / 1000}s, cancelling reader.`);
                        reader.cancel().catch(() => {});
                    }, INACTIVITY_MS);
                }

                // ── Extraction timeout ───────────────────────────────────
                // If semantic_filter completes but no opportunity_found events
                // arrive within 15s, synthesise opportunities from filtered URLs.
                const EXTRACTION_TIMEOUT_MS = 15_000;
                let extractionTimeout: ReturnType<typeof setTimeout> | null = null;

                function startExtractionTimer() {
                    if (extractionTimerStarted) return;
                    extractionTimerStarted = true;
                    extractionTimeout = setTimeout(() => {
                        if (opportunityCount === 0 && filteredUrls.length > 0 && !receivedComplete) {
                            console.log(`[Discovery] Extraction stalled. Synthesising ${filteredUrls.length} opportunities from filtered URLs.`);
                            synthesiseOpportunities();
                        }
                    }, EXTRACTION_TIMEOUT_MS);
                }

                function synthesiseOpportunities() {
                    // Take the filtered URLs and emit them as opportunity_found events
                    const urlsToEmit = filteredUrls.slice(0, 30); // Cap at 30
                    for (const url of urlsToEmit) {
                        try {
                            const hostname = new URL(url).hostname.replace("www.", "");
                            const pathParts = new URL(url).pathname
                                .split("/")
                                .filter(Boolean)
                                .map(p => p.replace(/-/g, " ").replace(/_/g, " "));

                            // Build a title from path segments
                            let title = pathParts.slice(-2).join(" - ") || hostname;
                            title = title
                                .split(" ")
                                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(" ")
                                .slice(0, 80);

                            opportunityCount++;
                            safeEnqueue(
                                sseEvent("opportunity_found", {
                                    type: "opportunity_found",
                                    id: `url_${Buffer.from(url).toString("base64url").slice(0, 20)}`,
                                    title,
                                    organization: hostname,
                                    url,
                                    source: "web",
                                    confidence: 0.7,
                                    category: "",
                                    opportunityType: "",
                                    locationType: "",
                                    summary: `Found via web search for "${query}"`,
                                })
                            );
                        } catch {
                            // skip malformed URLs
                        }
                    }
                }

                resetTimeout();

                // Track current event name as we parse line-by-line
                let currentEventName = "";

                try {
                    while (true) {
                        const result = await reader.read();
                        if (result.done) break;

                        if (result.value) {
                            resetTimeout();
                            // Forward raw bytes to browser
                            safeEnqueue(result.value);

                            // Parse to track events
                            buffer += decoder.decode(result.value, { stream: true });
                            const lines = buffer.split("\n");
                            buffer = lines.pop() || "";

                            for (const line of lines) {
                                if (line.startsWith("event: ")) {
                                    currentEventName = line.slice(7).trim();
                                } else if (line.startsWith("data: ") && currentEventName) {
                                    try {
                                        const data = JSON.parse(line.slice(6));

                                        if (currentEventName === "opportunity_found") {
                                            opportunityCount++;
                                            // Clear extraction timer — real opportunities are arriving
                                            if (extractionTimeout) {
                                                clearTimeout(extractionTimeout);
                                                extractionTimeout = null;
                                            }
                                        } else if (currentEventName === "complete" || currentEventName === "done") {
                                            receivedComplete = true;
                                        } else if (currentEventName === "layer_complete") {
                                            if (data.layer === "semantic_filter" && Array.isArray(data.items)) {
                                                filteredUrls = data.items;
                                                semanticFilterDone = true;
                                                console.log(`[Discovery] semantic_filter complete: ${filteredUrls.length} URLs`);
                                                startExtractionTimer();
                                            }
                                        }
                                    } catch {
                                        // Ignore parse errors
                                    }
                                    currentEventName = "";
                                } else if (line === "") {
                                    currentEventName = "";
                                }
                            }

                            if (receivedComplete) {
                                reader.cancel().catch(() => {});
                                break;
                            }
                        }
                    }
                } catch (err: any) {
                    if (!timedOut) {
                        console.error("[Discovery] Stream read error:", err);
                    }
                }

                // Clear timers
                if (timeoutHandle) clearTimeout(timeoutHandle);
                if (extractionTimeout) clearTimeout(extractionTimeout);

                // If extraction stalled and we haven't synthesised yet, do it now
                if (opportunityCount === 0 && filteredUrls.length > 0 && !receivedComplete) {
                    console.log(`[Discovery] Stream ended with 0 opportunities. Synthesising from ${filteredUrls.length} filtered URLs.`);
                    synthesiseOpportunities();
                }

                // Inject synthetic complete if backend never sent one
                if (!receivedComplete) {
                    console.log(`[Discovery] Injecting complete event (found ${opportunityCount}).`);
                    safeEnqueue(sseEvent("complete", { type: "complete", count: opportunityCount }));
                }

                console.log(`[Discovery] Stream done. Opportunities: ${opportunityCount}, timedOut: ${timedOut}`);
                safeClose();
            },
        });

        return new NextResponse(stream, { headers: SSE_HEADERS });
    } catch (error: any) {
        console.error("[Discovery] Error calling scraper:", error);
        return new NextResponse(
            sseErrorStream("Failed to connect to discovery service."),
            { headers: SSE_HEADERS }
        );
    }
}
