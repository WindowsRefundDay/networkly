"use server"

import { createClient, getCurrentUser } from "@/lib/supabase/server"
import { googleAI } from "@/lib/ai"

export async function generateMentorEmail(mentorId: string) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return { success: false, message: "Unauthorized" }

  // Fetch mentor details from scraper search/cache or stored activity
  // Since we don't have a mentors table, we might need to rely on what we can pass or re-fetch
  // For now, let's assume we can re-fetch from scraper or use passed details if we change the signature
  // But to stick to the signature:

  // We'll try to find the mentor in user_activities (saved mentors) first
  const { data: savedMentorData } = await supabase
    .from("user_activities")
    .select("metadata")
    .eq("user_id", user.id)
    .eq("type", "saved_mentor")
    .contains("metadata", { mentor_id: mentorId })
    .maybeSingle()

  const savedMentor = savedMentorData as any | null

  const mentorData = savedMentor?.metadata || { name: "Professor", research_areas: [] }

  // Fetch user profile
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("interests, career_goals, school, grade_level")
    .eq("user_id", user.id)
    .maybeSingle()

  const profile = profileData as any | null

  const prompt = `
    Draft a professional cold email for a high school student to a professor/mentor.
    
    Student:
    - School: ${profile?.school || "High School"}
    - Grade: ${profile?.grade_level || "Student"}
    - Interests: ${Array.isArray(profile?.interests) ? profile.interests.join(", ") : "General Science"}
    - Goals: ${profile?.career_goals || "Research experience"}
    
    Mentor:
    - Name: ${mentorData.mentor_name || "Professor"}
    - Institution: ${mentorData.institution || "University"}
    - Research Areas: ${Array.isArray(mentorData.research_areas) ? mentorData.research_areas.join(", ") : "Unknown"}
    
    The email should be concise, respectful, and express interest in their work.
    Return JSON format: { "subject": "string", "body": "string" }
  `

  try {
    const response = await googleAI.complete({
      messages: [{ role: 'user', content: prompt }],
    })

    // Parse response
    let text = response.text || ""
    // Remove markdown code blocks if any
    text = text.replace(/```json\n?|\n?```/g, "")

    let json
    try {
      json = JSON.parse(text)
    } catch (e) {
      // Fallback if not valid JSON
      json = { subject: "Research Inquiry", body: text }
    }

    return { success: true, email: json }
  } catch (error) {
    console.error("Email generation failed:", error)
    return { success: false, message: "Generation failed" }
  }
}
