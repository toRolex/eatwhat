export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_logs: {
        Row: {
          cost_micros: number | null
          created_at: string | null
          error: string | null
          event_id: string
          id: string
          input_hash: string | null
          input_tokens: number | null
          latency_ms: number | null
          model: string
          output_tokens: number | null
          provider: string
          raw_input: Json | null
          raw_output: Json | null
          stage: string
        }
        Insert: {
          cost_micros?: number | null
          created_at?: string | null
          error?: string | null
          event_id: string
          id?: string
          input_hash?: string | null
          input_tokens?: number | null
          latency_ms?: number | null
          model: string
          output_tokens?: number | null
          provider: string
          raw_input?: Json | null
          raw_output?: Json | null
          stage: string
        }
        Update: {
          cost_micros?: number | null
          created_at?: string | null
          error?: string | null
          event_id?: string
          id?: string
          input_hash?: string | null
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string
          output_tokens?: number | null
          provider?: string
          raw_input?: Json | null
          raw_output?: Json | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: Database["public"]["Enums"]["event_category"]
          cover_image_url: string | null
          created_at: string
          date_flexible: boolean
          description: string | null
          host_id: string
          id: string
          location_hint: string | null
          proposed_date: string | null
          rsvp_deadline: string
          slug: string
          status: Database["public"]["Enums"]["event_status"]
          template_id: string
          title: string
          updated_at: string
          vote_deadline: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["event_category"]
          cover_image_url?: string | null
          created_at?: string
          date_flexible?: boolean
          description?: string | null
          host_id: string
          id?: string
          location_hint?: string | null
          proposed_date?: string | null
          rsvp_deadline: string
          slug: string
          status?: Database["public"]["Enums"]["event_status"]
          template_id?: string
          title: string
          updated_at?: string
          vote_deadline?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["event_category"]
          cover_image_url?: string | null
          created_at?: string
          date_flexible?: boolean
          description?: string | null
          host_id?: string
          id?: string
          location_hint?: string | null
          proposed_date?: string | null
          rsvp_deadline?: string
          slug?: string
          status?: Database["public"]["Enums"]["event_status"]
          template_id?: string
          title?: string
          updated_at?: string
          vote_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finalized_plans: {
        Row: {
          calendar_data: Json
          confirmed_time: string
          created_at: string
          event_id: string
          id: string
          notes: string | null
          proposal_id: string
          updated_at: string
        }
        Insert: {
          calendar_data?: Json
          confirmed_time: string
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          proposal_id: string
          updated_at?: string
        }
        Update: {
          calendar_data?: Json
          confirmed_time?: string
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          proposal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finalized_plans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finalized_plans_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_preferences: {
        Row: {
          availability: Json | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          cuisine_avoid: string[]
          cuisine_prefs: string[]
          dietary: string[]
          event_id: string
          id: string
          invitation_id: string
          location_pref: string | null
          notes: string | null
          updated_at: string
          vibe_pref: string | null
        }
        Insert: {
          availability?: Json | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          cuisine_avoid?: string[]
          cuisine_prefs?: string[]
          dietary?: string[]
          event_id: string
          id?: string
          invitation_id: string
          location_pref?: string | null
          notes?: string | null
          updated_at?: string
          vibe_pref?: string | null
        }
        Update: {
          availability?: Json | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          cuisine_avoid?: string[]
          cuisine_prefs?: string[]
          dietary?: string[]
          event_id?: string
          id?: string
          invitation_id?: string
          location_pref?: string | null
          notes?: string | null
          updated_at?: string
          vibe_pref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_preferences_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: true
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          event_id: string
          fcm_token: string | null
          id: string
          invite_token: string
          name: string
          responded_at: string | null
          status: Database["public"]["Enums"]["invite_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          fcm_token?: string | null
          id?: string
          invite_token?: string
          name: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          fcm_token?: string | null
          id?: string
          invite_token?: string
          name?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          booking_url: string | null
          confidence_score: number | null
          constraint_coverage: Json | null
          constraints_gap: Json
          constraints_met: Json
          created_at: string
          cuisine_type: string
          envy_scores: Json | null
          event_id: string
          id: string
          image_url: string | null
          maps_url: string | null
          narrative_group: string | null
          narrative_personal: Json | null
          price_range: string
          rank: number
          rating: number | null
          reasoning: string
          restaurant_addr: string
          restaurant_name: string
          suggested_time: string | null
          updated_at: string
        }
        Insert: {
          booking_url?: string | null
          confidence_score?: number | null
          constraint_coverage?: Json | null
          constraints_gap?: Json
          constraints_met?: Json
          created_at?: string
          cuisine_type: string
          envy_scores?: Json | null
          event_id: string
          id?: string
          image_url?: string | null
          maps_url?: string | null
          narrative_group?: string | null
          narrative_personal?: Json | null
          price_range: string
          rank: number
          rating?: number | null
          reasoning: string
          restaurant_addr: string
          restaurant_name: string
          suggested_time?: string | null
          updated_at?: string
        }
        Update: {
          booking_url?: string | null
          confidence_score?: number | null
          constraint_coverage?: Json | null
          constraints_gap?: Json
          constraints_met?: Json
          created_at?: string
          cuisine_type?: string
          envy_scores?: Json | null
          event_id?: string
          id?: string
          image_url?: string | null
          maps_url?: string | null
          narrative_group?: string | null
          narrative_personal?: Json | null
          price_range?: string
          rank?: number
          rating?: number | null
          reasoning?: string
          restaurant_addr?: string
          restaurant_name?: string
          suggested_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_cache: {
        Row: {
          dietary_analysis: Json | null
          id: string
          last_analyzed: string | null
          menu_analysis: Json | null
          name: string
          place_id: string
          review_summary: string | null
          ttl_days: number | null
          vibe_embedding: string | null
        }
        Insert: {
          dietary_analysis?: Json | null
          id?: string
          last_analyzed?: string | null
          menu_analysis?: Json | null
          name: string
          place_id: string
          review_summary?: string | null
          ttl_days?: number | null
          vibe_embedding?: string | null
        }
        Update: {
          dietary_analysis?: Json | null
          id?: string
          last_analyzed?: string | null
          menu_analysis?: Json | null
          name?: string
          place_id?: string
          review_summary?: string | null
          ttl_days?: number | null
          vibe_embedding?: string | null
        }
        Relationships: []
      }
      structured_constraints: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string | null
          cuisine_avoids: string[] | null
          cuisine_likes: Json | null
          dealbreaker_flags: string[] | null
          dietary_hard: string[] | null
          dietary_soft: string[] | null
          event_id: string
          guest_id: string | null
          id: string
          intensity_tier: string | null
          invitation_id: string
          raw_text: string | null
          vibe_tags: string[] | null
          weight_multiplier: number | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          cuisine_avoids?: string[] | null
          cuisine_likes?: Json | null
          dealbreaker_flags?: string[] | null
          dietary_hard?: string[] | null
          dietary_soft?: string[] | null
          event_id: string
          guest_id?: string | null
          id?: string
          intensity_tier?: string | null
          invitation_id: string
          raw_text?: string | null
          vibe_tags?: string[] | null
          weight_multiplier?: number | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string | null
          cuisine_avoids?: string[] | null
          cuisine_likes?: Json | null
          dealbreaker_flags?: string[] | null
          dietary_hard?: string[] | null
          dietary_soft?: string[] | null
          event_id?: string
          guest_id?: string | null
          id?: string
          intensity_tier?: string | null
          invitation_id?: string
          raw_text?: string | null
          vibe_tags?: string[] | null
          weight_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "structured_constraints_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structured_constraints_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structured_constraints_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: true
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_log: {
        Row: {
          cost_micros: number
          created_at: string
          event_id: string | null
          id: string
          input_tokens: number | null
          kind: Database["public"]["Enums"]["usage_kind"]
          metadata: Json
          model: string | null
          output_tokens: number | null
          provider: string
          request_count: number
        }
        Insert: {
          cost_micros?: number
          created_at?: string
          event_id?: string | null
          id?: string
          input_tokens?: number | null
          kind: Database["public"]["Enums"]["usage_kind"]
          metadata?: Json
          model?: string | null
          output_tokens?: number | null
          provider: string
          request_count?: number
        }
        Update: {
          cost_micros?: number
          created_at?: string
          event_id?: string | null
          id?: string
          input_tokens?: number | null
          kind?: Database["public"]["Enums"]["usage_kind"]
          metadata?: Json
          model?: string | null
          output_tokens?: number | null
          provider?: string
          request_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          invitation_id: string
          proposal_id: string
          rank: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_id: string
          proposal_id: string
          rank: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_id?: string
          proposal_id?: string
          rank?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_event_guest: { Args: { p_event_id: string }; Returns: boolean }
      is_event_host: { Args: { p_event_id: string }; Returns: boolean }
      replace_proposals_and_advance: {
        Args: { p_event_id: string; p_rows: Json }
        Returns: undefined
      }
    }
    Enums: {
      event_category: "dinner" | "activity" | "movie"
      event_status:
        | "draft"
        | "open"
        | "collecting"
        | "deciding"
        | "finalized"
        | "cancelled"
      invite_status: "pending" | "accepted" | "declined"
      usage_kind: "ai_synthesis" | "venue_search" | "photo_proxy"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_category: ["dinner", "activity", "movie"],
      event_status: [
        "draft",
        "open",
        "collecting",
        "deciding",
        "finalized",
        "cancelled",
      ],
      invite_status: ["pending", "accepted", "declined"],
      usage_kind: ["ai_synthesis", "venue_search", "photo_proxy"],
    },
  },
} as const
