// Hand-written from supabase/migrations/. To regenerate from a running local instance:
//   supabase gen types typescript --local > packages/db/src/database.types.ts
// Requires: supabase start (Docker)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string  // no DEFAULT — always supplied by the handle_new_auth_user trigger
          name: string
          email: string
          phone?: string | null | undefined
          avatar_url?: string | null | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          name?: string | undefined
          email?: string | undefined
          phone?: string | null | undefined
          avatar_url?: string | null | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          host_id: string
          title: string
          description: string | null
          category: Database['public']['Enums']['event_category']
          cover_image_url: string | null
          template_id: string
          location_hint: string | null
          date_flexible: boolean
          proposed_date: string | null
          rsvp_deadline: string
          vote_deadline: string | null
          status: Database['public']['Enums']['event_status']
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | undefined
          host_id: string
          title: string
          description?: string | null | undefined
          category?: Database['public']['Enums']['event_category'] | undefined
          cover_image_url?: string | null | undefined
          template_id?: string | undefined
          location_hint?: string | null | undefined
          date_flexible?: boolean | undefined
          proposed_date?: string | null | undefined
          rsvp_deadline: string
          vote_deadline?: string | null | undefined
          status?: Database['public']['Enums']['event_status'] | undefined
          slug: string
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          host_id?: string | undefined
          title?: string | undefined
          description?: string | null | undefined
          category?: Database['public']['Enums']['event_category'] | undefined
          cover_image_url?: string | null | undefined
          template_id?: string | undefined
          location_hint?: string | null | undefined
          date_flexible?: boolean | undefined
          proposed_date?: string | null | undefined
          rsvp_deadline?: string | undefined
          vote_deadline?: string | null | undefined
          status?: Database['public']['Enums']['event_status'] | undefined
          slug?: string | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          event_id: string
          user_id: string | null
          invite_token: string
          name: string
          email: string
          status: Database['public']['Enums']['invite_status']
          responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | undefined
          event_id: string
          user_id?: string | null | undefined
          invite_token?: string | undefined
          name: string
          email: string
          status?: Database['public']['Enums']['invite_status'] | undefined
          responded_at?: string | null | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          event_id?: string | undefined
          user_id?: string | null | undefined
          invite_token?: string | undefined
          name?: string | undefined
          email?: string | undefined
          status?: Database['public']['Enums']['invite_status'] | undefined
          responded_at?: string | null | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Relationships: []
      }
      guest_preferences: {
        Row: {
          id: string
          invitation_id: string
          event_id: string
          dietary: string[]
          cuisine_prefs: string[]
          cuisine_avoid: string[]
          budget_min: number | null
          budget_max: number | null
          location_pref: string | null
          availability: Json | null
          vibe_pref: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | undefined
          invitation_id: string
          event_id: string
          dietary?: string[] | undefined
          cuisine_prefs?: string[] | undefined
          cuisine_avoid?: string[] | undefined
          budget_min?: number | null | undefined
          budget_max?: number | null | undefined
          location_pref?: string | null | undefined
          availability?: Json | null | undefined
          vibe_pref?: string | null | undefined
          notes?: string | null | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          invitation_id?: string | undefined
          event_id?: string | undefined
          dietary?: string[] | undefined
          cuisine_prefs?: string[] | undefined
          cuisine_avoid?: string[] | undefined
          budget_min?: number | null | undefined
          budget_max?: number | null | undefined
          location_pref?: string | null | undefined
          availability?: Json | null | undefined
          vibe_pref?: string | null | undefined
          notes?: string | null | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Relationships: []
      }
      proposals: {
        Row: {
          id: string
          event_id: string
          rank: number
          restaurant_name: string
          restaurant_addr: string
          cuisine_type: string
          price_range: string
          rating: number | null
          image_url: string | null
          maps_url: string | null
          booking_url: string | null
          reasoning: string
          constraints_met: Json
          constraints_gap: Json
          suggested_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | undefined
          event_id: string
          rank: number
          restaurant_name: string
          restaurant_addr: string
          cuisine_type: string
          price_range: string
          rating?: number | null | undefined
          image_url?: string | null | undefined
          maps_url?: string | null | undefined
          booking_url?: string | null | undefined
          reasoning: string
          constraints_met?: Json | undefined
          constraints_gap?: Json | undefined
          suggested_time?: string | null | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          event_id?: string | undefined
          rank?: number | undefined
          restaurant_name?: string | undefined
          restaurant_addr?: string | undefined
          cuisine_type?: string | undefined
          price_range?: string | undefined
          rating?: number | null | undefined
          image_url?: string | null | undefined
          maps_url?: string | null | undefined
          booking_url?: string | null | undefined
          reasoning?: string | undefined
          constraints_met?: Json | undefined
          constraints_gap?: Json | undefined
          suggested_time?: string | null | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Relationships: []
      }
      votes: {
        Row: {
          id: string
          proposal_id: string
          invitation_id: string
          rank: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | undefined
          proposal_id: string
          invitation_id: string
          rank: number
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          proposal_id?: string | undefined
          invitation_id?: string | undefined
          rank?: number | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Relationships: []
      }
      finalized_plans: {
        Row: {
          id: string
          event_id: string
          proposal_id: string
          confirmed_time: string
          notes: string | null
          calendar_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | undefined
          event_id: string
          proposal_id: string
          confirmed_time: string
          notes?: string | null | undefined
          calendar_data?: Json | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          event_id?: string | undefined
          proposal_id?: string | undefined
          confirmed_time?: string | undefined
          notes?: string | null | undefined
          calendar_data?: Json | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Relationships: []
      }
      usage_log: {
        Row: {
          id: string
          event_id: string | null
          kind: Database['public']['Enums']['usage_kind']
          provider: string
          model: string | null
          input_tokens: number | null
          output_tokens: number | null
          cost_micros: number
          request_count: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string | undefined
          event_id?: string | null | undefined
          kind: Database['public']['Enums']['usage_kind']
          provider: string
          model?: string | null | undefined
          input_tokens?: number | null | undefined
          output_tokens?: number | null | undefined
          cost_micros?: number | undefined
          request_count?: number | undefined
          metadata?: Json | undefined
          created_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          event_id?: string | null | undefined
          kind?: Database['public']['Enums']['usage_kind'] | undefined
          provider?: string | undefined
          model?: string | null | undefined
          input_tokens?: number | null | undefined
          output_tokens?: number | null | undefined
          cost_micros?: number | undefined
          request_count?: number | undefined
          metadata?: Json | undefined
          created_at?: string | undefined
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      replace_proposals_and_advance: {
        Args: { p_event_id: string; p_rows: Json }
        Returns: undefined
      }
    }
    Enums: {
      event_status: 'draft' | 'open' | 'collecting' | 'deciding' | 'finalized' | 'cancelled'
      event_category: 'dinner'
      invite_status: 'pending' | 'accepted' | 'declined'
      usage_kind: 'ai_synthesis' | 'venue_search' | 'photo_proxy'
    }
    CompositeTypes: Record<string, never>
  }
}
