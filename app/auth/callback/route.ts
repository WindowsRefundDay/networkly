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
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle()

      if (!existingUser) {
        const fallbackName = data.user.email?.split("@")[0] || "User"
        await supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata.full_name || fallbackName,
          avatar: data.user.user_metadata.avatar_url,
        })
      }

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
