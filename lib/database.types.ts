/**
 * Supabase Database Types
 * Auto-generated based on SUPABASE_MIGRATION_SPEC.md schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar: string | null
          headline: string | null
          bio: string | null
          location: string | null
          university: string | null
          graduation_year: number | null
          skills: string[]
          interests: string[]
          connections: number
          profile_views: number
          search_appearances: number
          completed_projects: number
          visibility: 'public' | 'private' | 'connections'
          is_profile_complete: boolean
          linkedin_url: string | null
          github_url: string | null
          portfolio_url: string | null
          last_viewed_at: string | null
          last_login_at: string | null
          last_updated_by: string | null
          profile_updated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          avatar?: string | null
          headline?: string | null
          bio?: string | null
          location?: string | null
          university?: string | null
          graduation_year?: number | null
          skills?: string[]
          interests?: string[]
          connections?: number
          profile_views?: number
          search_appearances?: number
          completed_projects?: number
          visibility?: 'public' | 'private' | 'connections'
          is_profile_complete?: boolean
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          last_viewed_at?: string | null
          last_login_at?: string | null
          last_updated_by?: string | null
          profile_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar?: string | null
          headline?: string | null
          bio?: string | null
          location?: string | null
          university?: string | null
          graduation_year?: number | null
          skills?: string[]
          interests?: string[]
          connections?: number
          profile_views?: number
          search_appearances?: number
          completed_projects?: number
          visibility?: 'public' | 'private' | 'connections'
          is_profile_complete?: boolean
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          last_viewed_at?: string | null
          last_login_at?: string | null
          last_updated_by?: string | null
          profile_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          id: string
          title: string
          description: string
          company: string
          location: string
          type: string
          category: string
          suggested_category: string | null
          skills: string[]
          grade_levels: number[]
          location_type: 'In-Person' | 'Online' | 'Hybrid'
          deadline: string | null
          posted_date: string
          start_date: string | null
          end_date: string | null
          cost: string | null
          time_commitment: string | null
          prizes: string | null
          contact_email: string | null
          application_url: string | null
          logo: string | null
          salary: string | null
          duration: string | null
          remote: boolean
          applicants: number
          requirements: string | null
          source_url: string | null
          url: string | null
          extraction_confidence: number
          is_active: boolean
          is_expired: boolean
          timing_type: 'one-time' | 'annual' | 'recurring' | 'rolling' | 'ongoing' | 'seasonal'
          last_verified: string | null
          recheck_at: string | null
          next_cycle_expected: string | null
          date_discovered: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          company: string
          location: string
          type: string
          category?: string
          suggested_category?: string | null
          skills?: string[]
          grade_levels?: number[]
          location_type?: 'In-Person' | 'Online' | 'Hybrid'
          deadline?: string | null
          posted_date?: string
          start_date?: string | null
          end_date?: string | null
          cost?: string | null
          time_commitment?: string | null
          prizes?: string | null
          contact_email?: string | null
          application_url?: string | null
          logo?: string | null
          salary?: string | null
          duration?: string | null
          remote?: boolean
          applicants?: number
          requirements?: string | null
          source_url?: string | null
          url?: string | null
          extraction_confidence?: number
          is_active?: boolean
          is_expired?: boolean
          timing_type?: 'one-time' | 'annual' | 'recurring' | 'rolling' | 'ongoing' | 'seasonal'
          last_verified?: string | null
          recheck_at?: string | null
          next_cycle_expected?: string | null
          date_discovered?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          company?: string
          location?: string
          type?: string
          category?: string
          suggested_category?: string | null
          skills?: string[]
          grade_levels?: number[]
          location_type?: 'In-Person' | 'Online' | 'Hybrid'
          deadline?: string | null
          posted_date?: string
          start_date?: string | null
          end_date?: string | null
          cost?: string | null
          time_commitment?: string | null
          prizes?: string | null
          contact_email?: string | null
          application_url?: string | null
          logo?: string | null
          salary?: string | null
          duration?: string | null
          remote?: boolean
          applicants?: number
          requirements?: string | null
          source_url?: string | null
          url?: string | null
          extraction_confidence?: number
          is_active?: boolean
          is_expired?: boolean
          timing_type?: 'one-time' | 'annual' | 'recurring' | 'rolling' | 'ongoing' | 'seasonal'
          last_verified?: string | null
          recheck_at?: string | null
          next_cycle_expected?: string | null
          date_discovered?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_opportunities: {
        Row: {
          id: string
          user_id: string
          opportunity_id: string
          match_score: number
          match_reasons: Json
          status: 'curated' | 'saved' | 'applied' | 'dismissed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          opportunity_id: string
          match_score?: number
          match_reasons?: Json
          status?: 'curated' | 'saved' | 'applied' | 'dismissed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          opportunity_id?: string
          match_score?: number
          match_reasons?: Json
          status?: 'curated' | 'saved' | 'applied' | 'dismissed'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_opportunities_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_opportunities_opportunity_id_fkey'
            columns: ['opportunity_id']
            isOneToOne: false
            referencedRelation: 'opportunities'
            referencedColumns: ['id']
          }
        ]
      }
      connections: {
        Row: {
          id: string
          requester_id: string
          receiver_id: string
          status: 'pending' | 'accepted' | 'rejected'
          mutual_connections: number
          match_reason: string | null
          connected_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          receiver_id: string
          status?: 'pending' | 'accepted' | 'rejected'
          mutual_connections?: number
          match_reason?: string | null
          connected_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          receiver_id?: string
          status?: 'pending' | 'accepted' | 'rejected'
          mutual_connections?: number
          match_reason?: string | null
          connected_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'connections_requester_id_fkey'
            columns: ['requester_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'connections_receiver_id_fkey'
            columns: ['receiver_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      messages: {
        Row: {
          id: string
          content: string
          sender_id: string
          receiver_id: string
          preview: string | null
          unread: boolean
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          sender_id: string
          receiver_id: string
          preview?: string | null
          unread?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          sender_id?: string
          receiver_id?: string
          preview?: string | null
          unread?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_receiver_id_fkey'
            columns: ['receiver_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      projects: {
        Row: {
          id: string
          title: string
          description: string
          image: string | null
          category: string
          status: string
          visibility: string
          likes: number
          views: number
          comments: number
          tags: string[]
          progress: number
          links: Json
          looking_for: string[]
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          image?: string | null
          category?: string
          status?: string
          visibility?: string
          likes?: number
          views?: number
          comments?: number
          tags?: string[]
          progress?: number
          links?: Json
          looking_for?: string[]
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          image?: string | null
          category?: string
          status?: string
          visibility?: string
          likes?: number
          views?: number
          comments?: number
          tags?: string[]
          progress?: number
          links?: Json
          looking_for?: string[]
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      project_collaborators: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_collaborators_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_collaborators_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      project_updates: {
        Row: {
          id: string
          project_id: string
          type: string
          title: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: string
          title?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: string
          title?: string | null
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_updates_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          title: string
          category: string
          description: string | null
          date: string
          icon: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          category?: string
          description?: string | null
          date: string
          icon: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          category?: string
          description?: string | null
          date?: string
          icon?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'achievements_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      extracurriculars: {
        Row: {
          id: string
          user_id: string
          title: string
          organization: string
          type: string
          start_date: string
          end_date: string
          description: string | null
          logo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          organization: string
          type: string
          start_date: string
          end_date: string
          description?: string | null
          logo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          organization?: string
          type?: string
          start_date?: string
          end_date?: string
          description?: string | null
          logo?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'extracurriculars_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      user_goals: {
        Row: {
          id: string
          user_id: string
          goal_text: string
          roadmap: Json
          filters: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_text: string
          roadmap?: Json
          filters?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_text?: string
          roadmap?: Json
          filters?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_goals_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      profile_goals: {
        Row: {
          id: string
          user_id: string
          title: string
          target_date: string
          status: 'pending' | 'in_progress' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          target_date: string
          status?: 'pending' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          target_date?: string
          status?: 'pending' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profile_goals_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      events: {
        Row: {
          id: string
          title: string
          date: string
          location: string
          type: string
          attendees: number
          image: string | null
          description: string | null
          match_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          date: string
          location: string
          type: string
          attendees?: number
          image?: string | null
          description?: string | null
          match_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          date?: string
          location?: string
          type?: string
          attendees?: number
          image?: string | null
          description?: string | null
          match_score?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          id: string
          user_id: string
          event_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_registrations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'event_registrations_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'events'
            referencedColumns: ['id']
          }
        ]
      }
      recommendations: {
        Row: {
          id: string
          content: string
          author_id: string
          receiver_id: string
          author_name: string
          author_role: string
          author_avatar: string | null
          date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          author_id: string
          receiver_id: string
          author_name: string
          author_role: string
          author_avatar?: string | null
          date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          author_id?: string
          receiver_id?: string
          author_name?: string
          author_role?: string
          author_avatar?: string | null
          date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recommendations_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recommendations_receiver_id_fkey'
            columns: ['receiver_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      skill_endorsements: {
        Row: {
          id: string
          skill: string
          endorser_id: string
          endorsee_id: string
          created_at: string
        }
        Insert: {
          id?: string
          skill: string
          endorser_id: string
          endorsee_id: string
          created_at?: string
        }
        Update: {
          id?: string
          skill?: string
          endorser_id?: string
          endorsee_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'skill_endorsements_endorser_id_fkey'
            columns: ['endorser_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'skill_endorsements_endorsee_id_fkey'
            columns: ['endorsee_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      social_links: {
        Row: {
          id: string
          user_id: string
          platform: string
          url: string
          is_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          url: string
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          url?: string
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'social_links_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      analytics_data: {
        Row: {
          id: string
          user_id: string
          profile_views: Json
          network_growth: Json
          skill_endorsements: Json
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          profile_views?: Json
          network_growth?: Json
          skill_endorsements?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          profile_views?: Json
          network_growth?: Json
          skill_endorsements?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'analytics_data_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      user_activities: {
        Row: {
          id: string
          user_id: string
          type: string
          metadata: Json | null
          date: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          metadata?: Json | null
          date?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          metadata?: Json | null
          date?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_activities_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          notify_opportunities: boolean
          notify_connections: boolean
          notify_messages: boolean
          weekly_digest: boolean
          public_profile: boolean
          show_activity_status: boolean
          show_profile_views: boolean
          ai_suggestions: boolean
          auto_icebreakers: boolean
          career_nudges: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notify_opportunities?: boolean
          notify_connections?: boolean
          notify_messages?: boolean
          weekly_digest?: boolean
          public_profile?: boolean
          show_activity_status?: boolean
          show_profile_views?: boolean
          ai_suggestions?: boolean
          auto_icebreakers?: boolean
          career_nudges?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notify_opportunities?: boolean
          notify_connections?: boolean
          notify_messages?: boolean
          weekly_digest?: boolean
          public_profile?: boolean
          show_activity_status?: boolean
          show_profile_views?: boolean
          ai_suggestions?: boolean
          auto_icebreakers?: boolean
          career_nudges?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_preferences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          interests: string[]
          location: string | null
          school: string | null
          grade_level: number | null
          career_goals: string | null
          preferred_opportunity_types: string[]
          academic_strengths: string[]
          availability: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          interests?: string[]
          location?: string | null
          school?: string | null
          grade_level?: number | null
          career_goals?: string | null
          preferred_opportunity_types?: string[]
          academic_strengths?: string[]
          availability?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          interests?: string[]
          location?: string | null
          school?: string | null
          grade_level?: number | null
          career_goals?: string | null
          preferred_opportunity_types?: string[]
          academic_strengths?: string[]
          availability?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_profiles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string | null
          messages: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          messages?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          messages?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_sessions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      chat_logs: {
        Row: {
          id: string
          user_id: string
          message: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          id: string
          user_id: string
          company: string
          position: string
          status: string
          applied_date: string
          next_step: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company: string
          position: string
          status?: string
          applied_date?: string
          next_step?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company?: string
          position?: string
          status?: string
          applied_date?: string
          next_step?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'applications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      pending_urls: {
        Row: {
          id: string
          url: string
          source: string | null
          discovered_at: string
          priority: number
          attempts: number
          last_attempt: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
        }
        Insert: {
          id?: string
          url: string
          source?: string | null
          discovered_at?: string
          priority?: number
          attempts?: number
          last_attempt?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
        }
        Update: {
          id?: string
          url?: string
          source?: string | null
          discovered_at?: string
          priority?: number
          attempts?: number
          last_attempt?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
        }
        Relationships: []
      }
      url_cache: {
        Row: {
          id: string
          url: string
          domain: string
          status: string
          first_seen: string
          last_checked: string
          next_recheck: string | null
          check_count: number
          success_count: number
          notes: string | null
        }
        Insert: {
          id?: string
          url: string
          domain: string
          status: string
          first_seen?: string
          last_checked?: string
          next_recheck?: string | null
          check_count?: number
          success_count?: number
          notes?: string | null
        }
        Update: {
          id?: string
          url?: string
          domain?: string
          status?: string
          first_seen?: string
          last_checked?: string
          next_recheck?: string | null
          check_count?: number
          success_count?: number
          notes?: string | null
        }
        Relationships: []
      }
      opportunity_embeddings: {
        Row: {
          id: string
          opportunity_id: string
          embedding: number[] | null
          content: string | null
          created_at: string
        }
        Insert: {
          id?: string
          opportunity_id: string
          embedding?: number[] | null
          content?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          opportunity_id?: string
          embedding?: number[] | null
          content?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'opportunity_embeddings_opportunity_id_fkey'
            columns: ['opportunity_id']
            isOneToOne: true
            referencedRelation: 'opportunities'
            referencedColumns: ['id']
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan: 'free' | 'pro' | 'enterprise'
          status: 'active' | 'cancelled' | 'past_due' | 'trialing'
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: 'free' | 'pro' | 'enterprise'
          status?: 'active' | 'cancelled' | 'past_due' | 'trialing'
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: 'free' | 'pro' | 'enterprise'
          status?: 'active' | 'cancelled' | 'past_due' | 'trialing'
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      project_likes: {
        Row: {
          id: string
          project_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_likes_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
