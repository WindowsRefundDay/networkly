import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const userProfileId = searchParams.get("userProfileId");

    if (!query) {
        return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
    }

    const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8080";
    const API_TOKEN = process.env.DISCOVERY_API_TOKEN;

    if (!API_TOKEN) {
        return NextResponse.json({ error: "DISCOVERY_API_TOKEN not configured on Vercel" }, { status: 500 });
    }

    try {
        const scraperUrl = new URL(`${SCRAPER_API_URL}/discover/stream`);
        scraperUrl.searchParams.set("query", query);
        if (userProfileId) scraperUrl.searchParams.set("userProfileId", userProfileId);

        console.log(`[Discovery] Calling scraper: ${scraperUrl.toString()}`);

        const response = await fetch(scraperUrl.toString(), {
            headers: {
                "Authorization": `Bearer ${API_TOKEN}`,
                "Accept": "text/event-stream",
            },
        });

        console.log(`[Discovery] Scraper responded: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({ error: `Scraper error: ${error}` }, { status: response.status });
        }

        // Create a new stream to pipe the response and log progress
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            console.log('[Discovery] Stream complete');
                            controller.close();
                            break;
                        }
                        // Log first chunk to verify start
                        if (value) {
                            // verbose logging for debugging
                            // console.log(`[Discovery] Received chunk: ${value.length} bytes`);
                            controller.enqueue(value);
                        }
                    }
                } catch (err) {
                    console.error('[Discovery] Stream error:', err);
                    controller.error(err);
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no", // Disable buffering for Nginx/Proxies
            },
        });
    } catch (error: any) {
        console.error("[Discovery] Error calling scraper:", error);
        return NextResponse.json({ error: "Failed to connect to scraper service" }, { status: 500 });
    }
}
