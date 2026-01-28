"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";

interface DiscoveryResult {
  success: boolean;
  message: string;
  opportunities?: any[];
}

interface ProjectData {
  title: string;
  description: string;
  tags: string[];
  category: string;
  looking_for: string[];
}

export async function discoverOpportunitiesForProject(projectId: string): Promise<DiscoveryResult> {
    const supabase = await createClient();
    const user = await getCurrentUser();
    
    if (!user) {
        return { success: false, message: "Unauthorized" };
    }

    const { data, error } = await supabase
        .from("projects")
        .select("title, description, tags, category, looking_for")
        .eq("id", projectId)
        .single();

    if (error || !data) {
        return { success: false, message: "Project not found" };
    }

    const project = data as unknown as ProjectData;

    const context = {
        role: "project_owner",
        project_title: project.title,
        project_description: project.description,
        tags: project.tags,
        category: project.category,
        needs: project.looking_for
    };

    const searchQuery = `opportunities for ${project.title} ${project.category} ${project.tags?.slice(0, 3).join(" ")}`;
    const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8080";
    const API_TOKEN = process.env.DISCOVERY_API_TOKEN;

    try {
        const response = await fetch(`${SCRAPER_API_URL}/api/v1/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(API_TOKEN ? { "Authorization": `Bearer ${API_TOKEN}` } : {})
            },
            body: JSON.stringify({ 
                query: searchQuery,
                limit: 5,
                context: context 
            }),
            signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) {
            return { success: false, message: "Discovery service unavailable" };
        }

        const data = await response.json();
        
        return {
            success: true,
            message: `Found ${data.count || 0} opportunities`,
            opportunities: data.results || []
        };

    } catch (error) {
        console.error("Goal discovery error:", error);
        return { success: false, message: "Discovery failed" };
    }
}
