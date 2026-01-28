"use server"

import { createClient, getCurrentUser } from "@/lib/supabase/server"
import { getAIManager } from "@/lib/ai/manager"

export async function generateMentorEmail(mentorId: string) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return { success: false, message: "Unauthorized" }

  // Fetch mentor details from scraper search/cache or stored activity
  // Since we don't have a mentors table, we might need to rely on what we can pass or re-fetch
  // For now, let's assume we can re-fetch from scraper or use passed details if we change the signature
  // But to stick to the signature:
  
  // We'll try to find the mentor in user_activities (saved mentors) first
  const { data: savedMentor } = await supabase
    .from("user_activities")
    .select("metadata")
    .eq("user_id", user.id)
    .eq("type", "saved_mentor")
    .contains("metadata", { mentor_id: mentorId })
    .single()

  const mentorData = savedMentor?.metadata || { name: "Professor", research_areas: [] }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("interests, career_goals, school, grade_level")
    .eq("user_id", user.id)
    .single()

  const aiManager = getAIManager()
  
  const prompt = `
    Draft a professional cold email for a high school student to a professor/mentor.
    
    Student:
    - School: ${profile?.school || "High School"}
    - Grade: ${profile?.grade_level || "Student"}
    - Interests: ${profile?.interests?.join(", ") || "General Science"}
    - Goals: ${profile?.career_goals || "Research experience"}
    
    Mentor:
    - Name: ${mentorData.mentor_name || "Professor"}
    - Institution: ${mentorData.institution || "University"}
    - Research Areas: ${mentorData.research_areas?.join(", ") || "Unknown"}
    
    The email should be concise, respectful, and express interest in their work.
    Return JSON format: { "subject": "string", "body": "string" }
  `

  try {
    const response = await aiManager.generateStructured(prompt, {
        type: "object",
        properties: {
            subject: { type: "string" },
            body: { type: "string" }
        },
        required: ["subject", "body"]
    }, { useCase: "writing" })

    return { success: true, email: response }
  } catch (error) {
    console.error("Email generation failed:", error)
    return { success: false, message: "Generation failed" }
  }
}
