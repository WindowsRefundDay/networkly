"use server";

export async function getSimilarOpportunities(opportunityId: string) {
    const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8080";
    const API_TOKEN = process.env.DISCOVERY_API_TOKEN;

    try {
        const response = await fetch(
            `${SCRAPER_API_URL}/api/v1/opportunities/${opportunityId}/similar?limit=5`,
            {
                headers: {
                    ...(API_TOKEN ? { "Authorization": `Bearer ${API_TOKEN}` } : {}),
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            console.error("Similar opportunities error:", response.status);
            return [];
        }

        const data = await response.json();
        return data.similar || [];
    } catch (error) {
        console.error("Error fetching similar opportunities:", error);
        return [];
    }
}
