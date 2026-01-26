import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirect = searchParams.get("redirect") || "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, is_profile_complete")
        .eq("id", data.user.id)
        .maybeSingle()

      let profileComplete = existingUser?.is_profile_complete ?? false

      if (!existingUser) {
        const fallbackName = data.user.email?.split("@")[0] || "User"
        const { data: createdUser } = await supabase
          .from("users")
          .insert({
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata.full_name || fallbackName,
            avatar: data.user.user_metadata.avatar_url,
            is_profile_complete: false,
          })
          .select("is_profile_complete")
          .single()

        profileComplete = createdUser?.is_profile_complete ?? false
      }

      if (!profileComplete) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
