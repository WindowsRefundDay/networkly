"use server"

import { revalidatePath } from "next/cache"

import { createClient, requireAuth } from "@/lib/supabase/server"

export async function getConnections() {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: connections, error } = await supabase
    .from("connections")
    .select(
      `
            *,
            requester:users!connections_requester_id_fkey (*),
            receiver:users!connections_receiver_id_fkey (*)
        `
    )
    .or(`requester_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return (connections || []).map((conn) => {
    const otherUser = conn.requester_id === authUser.id ? conn.receiver : conn.requester
    return {
      id: conn.id,
      name: otherUser.name,
      headline: otherUser.headline,
      avatar: otherUser.avatar,
      mutualConnections: conn.mutual_connections,
      matchReason: conn.match_reason,
      status: conn.status as "connected" | "pending" | "suggested",
      connectedDate: conn.connected_date
        ? new Date(conn.connected_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : null,
    }
  })
}

export async function getSuggestedConnections() {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: existingConnections } = await supabase
    .from("connections")
    .select("requester_id, receiver_id")
    .or(`requester_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)

  const connectedUserIds = new Set(
    (existingConnections || []).flatMap((c) => [c.requester_id, c.receiver_id])
  )
  connectedUserIds.add(authUser.id)

  const { data: suggestedUsers, error } = await supabase
    .from("users")
    .select("id, name, headline, avatar")
    .not("id", "in", `(${Array.from(connectedUserIds).join(",")})`)
    .limit(6)

  if (error) throw new Error(error.message)

  return (suggestedUsers || []).map((u) => ({
    id: u.id,
    name: u.name,
    headline: u.headline,
    avatar: u.avatar,
    mutualConnections: 0,
    matchReason: "Suggested based on your profile",
  }))
}

export async function sendConnectionRequest(receiverId: string) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: connection, error } = await supabase
    .from("connections")
    .insert({
      requester_id: authUser.id,
      receiver_id: receiverId,
      status: "pending",
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/network")
  return connection
}

export async function acceptConnectionRequest(connectionId: string) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: connection, error } = await supabase
    .from("connections")
    .update({
      status: "accepted",
      connected_date: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/network")
  return connection
}

export async function removeConnection(connectionId: string) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("id", connectionId)

  if (error) throw new Error(error.message)

  revalidatePath("/network")
}

export async function getNetworkStats() {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: user } = await supabase
    .from("users")
    .select("profile_views")
    .eq("id", authUser.id)
    .single()

  const { count: totalConnections } = await supabase
    .from("connections")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
    .eq("status", "accepted")

  const { count: pendingRequests } = await supabase
    .from("connections")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", authUser.id)
    .eq("status", "pending")

  const { count: unreadMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", authUser.id)
    .eq("unread", true)

  return {
    totalConnections: totalConnections || 0,
    pendingRequests: pendingRequests || 0,
    unreadMessages: unreadMessages || 0,
    profileViews: user?.profile_views || 0,
  }
}
