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
        setAll(cookiesToSet: Array<{ name: string; value: string; options: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: any }) => {
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

import { MOCK_USER, isDev } from "./dev-auth"

export async function getCurrentUser() {
  if (isDev()) return MOCK_USER

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
