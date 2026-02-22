/**
 * Type Utilities for Supabase Queries
 * 
 * This file provides helper types to improve type safety when working with Supabase.
 */

import type { Database } from './database.types'

// Table row types
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Opportunity = Database['public']['Tables']['opportunities']['Row']
export type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert']
export type OpportunityUpdate = Database['public']['Tables']['opportunities']['Update']

export type UserOpportunity = Database['public']['Tables']['user_opportunities']['Row']
export type UserOpportunityInsert = Database['public']['Tables']['user_opportunities']['Insert']
export type UserOpportunityUpdate = Database['public']['Tables']['user_opportunities']['Update']

export type Connection = Database['public']['Tables']['connections']['Row']
export type ConnectionInsert = Database['public']['Tables']['connections']['Insert']
export type ConnectionUpdate = Database['public']['Tables']['connections']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type AppEvent = Database['public']['Tables']['events']['Row']
export type AppEventInsert = Database['public']['Tables']['events']['Insert']
export type AppEventUpdate = Database['public']['Tables']['events']['Update']

export type Achievement = Database['public']['Tables']['achievements']['Row']
export type AchievementInsert = Database['public']['Tables']['achievements']['Insert']
export type AchievementUpdate = Database['public']['Tables']['achievements']['Update']

export type Extracurricular = Database['public']['Tables']['extracurriculars']['Row']
export type ExtracurricularInsert = Database['public']['Tables']['extracurriculars']['Insert']
export type ExtracurricularUpdate = Database['public']['Tables']['extracurriculars']['Update']

export type UserGoal = Database['public']['Tables']['user_goals']['Row']
export type UserGoalInsert = Database['public']['Tables']['user_goals']['Insert']
export type UserGoalUpdate = Database['public']['Tables']['user_opportunities']['Update']

export type ProfileGoal = Database['public']['Tables']['profile_goals']['Row']
export type ProfileGoalInsert = Database['public']['Tables']['profile_goals']['Insert']
export type ProfileGoalUpdate = Database['public']['Tables']['profile_goals']['Update']

export type Recommendation = Database['public']['Tables']['recommendations']['Row']
export type RecommendationInsert = Database['public']['Tables']['recommendations']['Insert']
export type RecommendationUpdate = Database['public']['Tables']['recommendations']['Update']

export type EventRegistration = Database['public']['Tables']['event_registrations']['Row']
export type EventRegistrationInsert = Database['public']['Tables']['event_registrations']['Insert']
export type EventRegistrationUpdate = Database['public']['Tables']['event_registrations']['Update']

export type ProjectCollaborator = Database['public']['Tables']['project_collaborators']['Row']
export type ProjectCollaboratorInsert = Database['public']['Tables']['project_collaborators']['Insert']
export type ProjectCollaboratorUpdate = Database['public']['Tables']['project_collaborators']['Update']

export type ProjectUpdateRow = Database['public']['Tables']['project_updates']['Row']
export type ProjectUpdateInsert = Database['public']['Tables']['project_updates']['Insert']
export type ProjectUpdateUpdate = Database['public']['Tables']['project_updates']['Update']

// Type for common join patterns
export type ConnectionWithUsers = Connection & {
    requester: User
    receiver: User
}

export type UserOpportunityWithOpportunity = UserOpportunity & {
    opportunity: Opportunity
}

export type MessageWithUsers = Message & {
    sender: User
    receiver: User
}

export type ProjectWithOwner = Project & {
    owner: User
}

// Helper types for select queries
export type SelectResult<T> = T extends any[] ? T : T | null

// Type guards
export function isUser(obj: any): obj is User {
    return obj && typeof obj.id === 'string' && typeof obj.email === 'string'
}

export function isOpportunity(obj: any): obj is Opportunity {
    return obj && typeof obj.id === 'string' && typeof obj.title === 'string'
}
