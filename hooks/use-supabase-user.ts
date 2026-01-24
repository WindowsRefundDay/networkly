"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/client"

export function useSupabaseUser() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!isMounted) return
      setUser(data.user ?? null)
      setLoading(false)
    }

    loadUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading, signOut }
}
