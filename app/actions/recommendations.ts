"use server"

import { revalidatePath } from "next/cache"

import { createClient, requireAuth } from "@/lib/supabase/server"

export async function getRecommendations(targetUserId?: string) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const userId = targetUserId || authUser.id

  const { data: recommendations, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("receiver_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getRecommendations]", error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (recommendations || []).map((rec: any) => ({
    id: rec.id,
    author: rec.author_name,
    role: rec.author_role,
    avatar: rec.author_avatar,
    content: rec.content,
    date: rec.date,
  }))
}

export async function addRecommendation(data: {
  receiverId: string
  content: string
  authorName: string
  authorRole: string
  authorAvatar?: string
  date: string
}) {
  const supabase = await createClient()
  const authUser = await requireAuth()

  const { data: recommendation, error } = await supabase
    .from("recommendations")
    .insert({
      receiver_id: data.receiverId,
      content: data.content,
      author_name: data.authorName,
      author_role: data.authorRole,
      author_avatar: data.authorAvatar || null,
      date: data.date,
      author_id: authUser.id,
    })
    .select()
    .single()

  if (error || !recommendation) {
    console.error("[addRecommendation]", error)
    throw new Error("Failed to add recommendation")
  }

  revalidatePath("/profile")
  return recommendation
}
