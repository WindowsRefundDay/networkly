 "use server"

 import { revalidatePath } from "next/cache"
 import { z } from "zod"

 import { createClient, requireAuth } from "@/lib/supabase/server"

 const onboardingSchema = z.object({
   name: z.string().min(1).max(100),
   location: z.string().min(1).max(100),
   school: z.string().min(1).max(100),
   gradeLevel: z.number().int().min(9).max(12),
   graduationYear: z.number().int().min(2020).max(2100),
   interests: z.array(z.string().min(1).max(50)).min(1).max(20),
   skills: z.array(z.string().min(1).max(50)).min(1).max(50),
   careerGoals: z.string().min(1).max(500),
   academicStrengths: z.array(z.string().min(1).max(50)).min(1).max(15),
   preferredOpportunityTypes: z.array(z.string().min(1).max(50)).min(1).max(10),
   availability: z.string().min(1).max(50),
 })

 export type CompleteOnboardingInput = z.infer<typeof onboardingSchema>

 export async function completeOnboarding(input: CompleteOnboardingInput) {
   const authUser = await requireAuth()
   const supabase = await createClient()

   try {
     const data = onboardingSchema.parse(input)

     const { data: user, error: userError } = await supabase
       .from("users")
       .update({
         name: data.name,
         location: data.location,
         university: data.school,
         graduation_year: data.graduationYear,
         skills: data.skills,
         interests: data.interests,
         is_profile_complete: true,
         profile_updated_at: new Date().toISOString(),
       })
       .eq("id", authUser.id)
       .select()
       .single()

     if (userError) {
       console.error("[completeOnboarding] User update error:", userError)
       return { success: false, error: "Failed to update user profile" }
     }

     const { data: existingProfile } = await supabase
       .from("user_profiles")
       .select("id")
       .eq("user_id", authUser.id)
       .single()

     const profilePayload = {
       user_id: authUser.id,
       school: data.school,
       grade_level: data.gradeLevel,
       interests: data.interests,
       location: data.location,
       career_goals: data.careerGoals,
       preferred_opportunity_types: data.preferredOpportunityTypes,
       academic_strengths: data.academicStrengths,
       availability: data.availability,
       updated_at: new Date().toISOString(),
     }

     const profileResponse = existingProfile
       ? await supabase
           .from("user_profiles")
           .update(profilePayload)
           .eq("user_id", authUser.id)
           .select()
           .single()
       : await supabase
           .from("user_profiles")
           .insert(profilePayload)
           .select()
           .single()

     if (profileResponse.error) {
       console.error("[completeOnboarding] Profile update error:", profileResponse.error)
       return { success: false, error: "Failed to update student profile" }
     }

     revalidatePath("/profile")
     revalidatePath("/dashboard")
     revalidatePath("/opportunities")

     return { success: true, data: { user, profile: profileResponse.data } }
   } catch (error) {
     console.error("[completeOnboarding]", error)
     return {
       success: false,
       error: error instanceof Error ? error.message : "Unknown error",
     }
   }
 }
