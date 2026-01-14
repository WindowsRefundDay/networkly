'use server'

/**
 * Chat Session Actions - CRUD for saved chat conversations
 * 
 * Each user can save exactly ONE chat session.
 * Sessions are cleared on refresh, but user can save one to restore later.
 */

import { auth } from '@clerk/nextjs/server'
import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  opportunities?: Array<{
    id: string
    title: string
    organization: string
    location: string
    type: string
    deadline: string | null
  }>
}

export interface ChatSession {
  id: string
  title: string | null
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Get the user's saved chat session (if any)
 */
export async function getSavedChatSession(): Promise<ChatSession | null> {
  try {
    // Safety check - chatSession model may not be available during hot reload
    if (!prisma.chatSession) {
      console.warn('[getSavedChatSession] chatSession model not available - restart dev server')
      return null
    }

    const { userId: clerkId } = await auth()
    if (!clerkId) return null

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })

    if (!user) return null

    const session = await prisma.chatSession.findUnique({
      where: { userId: user.id },
    })

    if (!session) return null

    return {
      id: session.id,
      title: session.title,
      messages: session.messages as unknown as ChatMessage[],
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }
  } catch (error) {
    console.error('[getSavedChatSession]', error)
    return null
  }
}

/**
 * Save the current chat session (replaces existing)
 */
export async function saveChatSession(
  messages: ChatMessage[],
  title?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Safety check - chatSession model may not be available during hot reload
    if (!prisma.chatSession) {
      return { success: false, error: 'Chat session not available - restart dev server' }
    }

    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return { success: false, error: 'Unauthorized' }
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Generate a title from the first user message if not provided
    const autoTitle = title || generateTitle(messages)

    // Upsert - create or replace the existing session
    await prisma.chatSession.upsert({
      where: { userId: user.id },
      update: {
        messages: messages as unknown as Prisma.InputJsonValue,
        title: autoTitle,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        messages: messages as unknown as Prisma.InputJsonValue,
        title: autoTitle,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('[saveChatSession]', error)
    return { success: false, error: 'Failed to save chat session' }
  }
}

/**
 * Delete the user's saved chat session
 */
export async function deleteChatSession(): Promise<{ success: boolean; error?: string }> {
  try {
    // Safety check - chatSession model may not be available during hot reload
    if (!prisma.chatSession) {
      return { success: false, error: 'Chat session not available - restart dev server' }
    }

    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return { success: false, error: 'Unauthorized' }
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    await prisma.chatSession.deleteMany({
      where: { userId: user.id },
    })

    return { success: true }
  } catch (error) {
    console.error('[deleteChatSession]', error)
    return { success: false, error: 'Failed to delete chat session' }
  }
}

/**
 * Generate a title from the first user message
 */
function generateTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user')
  if (!firstUserMessage) return 'Chat Session'

  // Take first 50 chars and add ellipsis if needed
  const content = firstUserMessage.content.trim()
  if (content.length <= 50) return content
  return content.slice(0, 47) + '...'
}
