'use server'

/**
 * Chat Session Actions - CRUD for saved chat conversations
 *
 * Each user can save exactly ONE chat session.
 * Sessions are cleared on refresh, but user can save one to restore later.
 */

import { createClient, getCurrentUser } from '@/lib/supabase/server'

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
    const supabase = await createClient()
    const authUser = await getCurrentUser()
    if (!authUser) return null

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', authUser.id)
      .single()

    if (error || !session) return null

    return {
      id: session.id,
      title: session.title,
      messages: session.messages as unknown as ChatMessage[],
      createdAt: new Date(session.created_at),
      updatedAt: new Date(session.updated_at),
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
    const supabase = await createClient()
    const authUser = await getCurrentUser()
    if (!authUser) {
      return { success: false, error: 'Unauthorized' }
    }

    const autoTitle = title || generateTitle(messages)

    const { error } = await supabase
      .from('chat_sessions')
      .upsert(
        {
          user_id: authUser.id,
          messages: messages as unknown as Record<string, unknown>[],
          title: autoTitle,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

    if (error) {
      console.error('[saveChatSession]', error)
      return { success: false, error: 'Failed to save chat session' }
    }

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
    const supabase = await createClient()
    const authUser = await getCurrentUser()
    if (!authUser) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('user_id', authUser.id)

    if (error) {
      console.error('[deleteChatSession]', error)
      return { success: false, error: 'Failed to delete chat session' }
    }

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
  const firstUserMessage = messages.find((m) => m.role === 'user')
  if (!firstUserMessage) return 'Chat Session'

  const content = firstUserMessage.content.trim()
  if (content.length <= 50) return content
  return content.slice(0, 47) + '...'
}
