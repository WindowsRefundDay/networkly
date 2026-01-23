"use server"

import { revalidatePath } from "next/cache"

import { createClient, requireAuth } from "@/lib/supabase/server"

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return `${Math.floor(diffDays / 7)} weeks ago`
}

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export async function getMessages() {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: messages, error } = await supabase
    .from("messages")
    .select(
      `
            *,
            sender:users!messages_sender_id_fkey (*),
            receiver:users!messages_receiver_id_fkey (*)
        `
    )
    .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return (messages || []).map((msg) => ({
    id: msg.id,
    senderId: msg.sender_id,
    senderName: msg.sender.name,
    senderAvatar: msg.sender.avatar,
    preview: msg.preview || msg.content.substring(0, 80) + "...",
    timestamp: getRelativeTime(new Date(msg.created_at)),
    unread: msg.unread && msg.receiver_id === authUser.id,
  }))
}

export async function getConversation(otherUserId: string) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: messages, error } = await supabase
    .from("messages")
    .select(
      `
            *,
            sender:users!messages_sender_id_fkey (*)
        `
    )
    .or(
      `and(sender_id.eq.${authUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${authUser.id})`
    )
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)

  await supabase
    .from("messages")
    .update({ unread: false })
    .eq("sender_id", otherUserId)
    .eq("receiver_id", authUser.id)
    .eq("unread", true)

  return (messages || []).map((msg) => ({
    id: msg.id,
    content: msg.content,
    senderId: msg.sender_id,
    senderName: msg.sender.name,
    senderAvatar: msg.sender.avatar,
    isOwn: msg.sender_id === authUser.id,
    timestamp: formatMessageTime(new Date(msg.created_at)),
  }))
}

export async function sendMessage(receiverId: string, content: string) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      content,
      sender_id: authUser.id,
      receiver_id: receiverId,
      preview: content.substring(0, 80),
      unread: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/network")
  return message
}

export async function markMessagesAsRead(senderId: string) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { error } = await supabase
    .from("messages")
    .update({ unread: false })
    .eq("sender_id", senderId)
    .eq("receiver_id", authUser.id)
    .eq("unread", true)

  if (error) throw new Error(error.message)

  revalidatePath("/network")
}
