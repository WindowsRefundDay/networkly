import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import type { Database } from "@/lib/database.types"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components might not allow setting cookies.
          }
        },
      },
    }
  )
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}
