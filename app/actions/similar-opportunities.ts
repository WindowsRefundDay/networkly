"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function getSimilarOpportunities(opportunityId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc("get_similar_opportunities", {
        opportunity_id: opportunityId,
        match_count: 5
    });

    if (error) {
        console.error("Error fetching similar opportunities:", error);
        return [];
    }

    return data || [];
}
