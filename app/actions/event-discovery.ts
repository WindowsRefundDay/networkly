"use server";

import { z } from "zod";

export interface EventFilters {
  locationType: 'online' | 'in-person' | 'all';
  topic?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface DiscoveryResult {
  success: boolean;
  message: string;
  count?: number;
  data?: any[];
}

export async function discoverEvents(
  query: string,
  filters: EventFilters
): Promise<DiscoveryResult> {
  const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8080";
  const API_TOKEN = process.env.DISCOVERY_API_TOKEN;

  const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s]/g, "").slice(0, 100);

  if (!sanitizedQuery || sanitizedQuery.length < 3) {
    return {
      success: false,
      message: "Query too short. Please provide at least 3 characters."
    };
  }

  let expandedQuery = sanitizedQuery;
  if (filters.topic) expandedQuery += ` ${filters.topic}`;
  if (filters.locationType === 'online') expandedQuery += " virtual online";
  if (filters.locationType === 'in-person') expandedQuery += " in-person";
  
  try {
    const response = await fetch(`${SCRAPER_API_URL}/api/v1/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { "Authorization": `Bearer ${API_TOKEN}` } : {})
      },
      body: JSON.stringify({ 
        query: expandedQuery,
        limit: 10,
        category: "event" 
      }),
      signal: AbortSignal.timeout(60000) 
    });

    if (!response.ok) {
        console.error(`Scraper API error: ${response.status} ${response.statusText}`);
        return {
            success: false,
            message: "Event discovery service unavailable.",
        };
    }

    const data = await response.json();
    
    return {
        success: true,
        message: data.count > 0 
            ? `Found ${data.count} events!` 
            : "Search complete. No new events found.",
        count: data.count,
        data: data.results || []
    };

  } catch (error) {
    console.error("Event discovery error:", error);
    return {
        success: false,
        message: "Event discovery failed. Please try again later.",
    };
  }
}

export async function searchEvents(query: string) {
    return discoverEvents(query, { locationType: 'all' });
}
