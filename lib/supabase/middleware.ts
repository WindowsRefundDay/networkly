import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

type CookieToSet = { name: string; value: string; options?: CookieOptions }

import { MOCK_USER, isDev } from "./dev-auth"

export async function updateSession(request: NextRequest) {
  if (isDev()) {
    return { supabaseResponse: NextResponse.next({ request }), user: MOCK_USER }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    const { data } = await supabase.auth.getUser()
    return { supabaseResponse, user: data.user ?? null }
  } catch {
    request.cookies
      .getAll()
      .filter((c) => c.name.startsWith("sb-"))
      .forEach((c) => supabaseResponse.cookies.delete(c.name))

    return { supabaseResponse, user: null }
  }
}
