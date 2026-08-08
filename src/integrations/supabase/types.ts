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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      lead_activity: {
        Row: {
          browser: string | null
          calculator_slug: string | null
          created_at: string
          device: string | null
          email: string | null
          full_name: string | null
          id: string
          ip_address: string | null
          kind: string
          lead_id: string
          metadata: Json
          phone: string | null
          platform: string | null
          resource_id: string | null
          submission_id: string | null
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          calculator_slug?: string | null
          created_at?: string
          device?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          kind?: string
          lead_id: string
          metadata?: Json
          phone?: string | null
          platform?: string | null
          resource_id?: string | null
          submission_id?: string | null
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          calculator_slug?: string | null
          created_at?: string
          device?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          kind?: string
          lead_id?: string
          metadata?: Json
          phone?: string | null
          platform?: string | null
          resource_id?: string | null
          submission_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activity_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activity_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "rr_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_imports: {
        Row: {
          created_at: string
          created_by: string | null
          duplicate_count: number
          failed_count: number
          file_name: string
          id: string
          imported_count: number
          skipped_count: number
          total_rows: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duplicate_count?: number
          failed_count?: number
          file_name: string
          id?: string
          imported_count?: number
          skipped_count?: number
          total_rows?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duplicate_count?: number
          failed_count?: number
          file_name?: string
          id?: string
          imported_count?: number
          skipped_count?: number
          total_rows?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          browser: string | null
          business_name: string | null
          country: string | null
          created_at: string
          device: string | null
          email: string
          first_name: string | null
          full_name: string
          funnel_id: string | null
          funnel_name: string | null
          funnel_response_data: Json | null
          funnel_result: Json | null
          funnel_score: number | null
          funnel_version: string | null
          id: string
          industry: string | null
          ip_address: string | null
          job_title: string | null
          last_name: string | null
          lead_score: number | null
          location: string | null
          notes: string | null
          phone: string | null
          platform: string
          resource_id: string | null
          source: string | null
          status: string
          tags: string[]
          updated_at: string
          user_agent: string | null
          website: string | null
        }
        Insert: {
          browser?: string | null
          business_name?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          email: string
          first_name?: string | null
          full_name: string
          funnel_id?: string | null
          funnel_name?: string | null
          funnel_response_data?: Json | null
          funnel_result?: Json | null
          funnel_score?: number | null
          funnel_version?: string | null
          id?: string
          industry?: string | null
          ip_address?: string | null
          job_title?: string | null
          last_name?: string | null
          lead_score?: number | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          platform?: string
          resource_id?: string | null
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_agent?: string | null
          website?: string | null
        }
        Update: {
          browser?: string | null
          business_name?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          email?: string
          first_name?: string | null
          full_name?: string
          funnel_id?: string | null
          funnel_name?: string | null
          funnel_response_data?: Json | null
          funnel_result?: Json | null
          funnel_score?: number | null
          funnel_version?: string | null
          id?: string
          industry?: string | null
          ip_address?: string | null
          job_title?: string | null
          last_name?: string | null
          lead_score?: number | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          platform?: string
          resource_id?: string | null
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_agent?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          button_text: string
          category: string
          created_at: string
          description: string
          external_url: string | null
          file_path: string | null
          id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          slug: string
          status: Database["public"]["Enums"]["resource_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_text?: string
          category?: string
          created_at?: string
          description?: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          slug: string
          status?: Database["public"]["Enums"]["resource_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_text?: string
          category?: string
          created_at?: string
          description?: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
          slug?: string
          status?: Database["public"]["Enums"]["resource_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rr_calculator_versions: {
        Row: {
          calculator_id: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          snapshot: Json
          version: number
        }
        Insert: {
          calculator_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          snapshot: Json
          version: number
        }
        Update: {
          calculator_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rr_calculator_versions_calculator_id_fkey"
            columns: ["calculator_id"]
            isOneToOne: false
            referencedRelation: "rr_calculators"
            referencedColumns: ["id"]
          },
        ]
      }
      rr_calculators: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          industries: string[]
          key: string
          name: string
          outcome: string
          published_at: string | null
          published_version: number | null
          settings: Json
          slug: string
          status: Database["public"]["Enums"]["rr_status"]
          tagline: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          industries?: string[]
          key: string
          name: string
          outcome?: string
          published_at?: string | null
          published_version?: number | null
          settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["rr_status"]
          tagline?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          industries?: string[]
          key?: string
          name?: string
          outcome?: string
          published_at?: string | null
          published_version?: number | null
          settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["rr_status"]
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      rr_events: {
        Row: {
          calculator_id: string | null
          created_at: string
          device: string | null
          event: string
          id: string
          industry: string | null
          payload: Json
          referrer: string | null
          session_id: string | null
          slug: string
          source: string | null
        }
        Insert: {
          calculator_id?: string | null
          created_at?: string
          device?: string | null
          event: string
          id?: string
          industry?: string | null
          payload?: Json
          referrer?: string | null
          session_id?: string | null
          slug: string
          source?: string | null
        }
        Update: {
          calculator_id?: string | null
          created_at?: string
          device?: string | null
          event?: string
          id?: string
          industry?: string | null
          payload?: Json
          referrer?: string | null
          session_id?: string | null
          slug?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rr_events_calculator_id_fkey"
            columns: ["calculator_id"]
            isOneToOne: false
            referencedRelation: "rr_calculators"
            referencedColumns: ["id"]
          },
        ]
      }
      rr_questions: {
        Row: {
          calculator_id: string
          conditions: Json
          created_at: string
          help: string
          id: string
          industry: string | null
          insight: string
          key: string
          label: string
          options: Json
          order_index: number
          required: boolean
          scoring: Json
          section: string | null
          tooltip: string
          type: Database["public"]["Enums"]["rr_question_type"]
          updated_at: string
          validation: Json
          weight: number
        }
        Insert: {
          calculator_id: string
          conditions?: Json
          created_at?: string
          help?: string
          id?: string
          industry?: string | null
          insight?: string
          key: string
          label?: string
          options?: Json
          order_index?: number
          required?: boolean
          scoring?: Json
          section?: string | null
          tooltip?: string
          type: Database["public"]["Enums"]["rr_question_type"]
          updated_at?: string
          validation?: Json
          weight?: number
        }
        Update: {
          calculator_id?: string
          conditions?: Json
          created_at?: string
          help?: string
          id?: string
          industry?: string | null
          insight?: string
          key?: string
          label?: string
          options?: Json
          order_index?: number
          required?: boolean
          scoring?: Json
          section?: string | null
          tooltip?: string
          type?: Database["public"]["Enums"]["rr_question_type"]
          updated_at?: string
          validation?: Json
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "rr_questions_calculator_id_fkey"
            columns: ["calculator_id"]
            isOneToOne: false
            referencedRelation: "rr_calculators"
            referencedColumns: ["id"]
          },
        ]
      }
      rr_recommendations: {
        Row: {
          body: string
          calculator_id: string
          created_at: string
          cta: Json
          id: string
          industry: string | null
          order_index: number
          title: string
          triggers: Json
          updated_at: string
        }
        Insert: {
          body?: string
          calculator_id: string
          created_at?: string
          cta?: Json
          id?: string
          industry?: string | null
          order_index?: number
          title?: string
          triggers?: Json
          updated_at?: string
        }
        Update: {
          body?: string
          calculator_id?: string
          created_at?: string
          cta?: Json
          id?: string
          industry?: string | null
          order_index?: number
          title?: string
          triggers?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rr_recommendations_calculator_id_fkey"
            columns: ["calculator_id"]
            isOneToOne: false
            referencedRelation: "rr_calculators"
            referencedColumns: ["id"]
          },
        ]
      }
      rr_scoring_rules: {
        Row: {
          calculator_id: string
          config: Json
          created_at: string
          id: string
          industry: string | null
          updated_at: string
        }
        Insert: {
          calculator_id: string
          config?: Json
          created_at?: string
          id?: string
          industry?: string | null
          updated_at?: string
        }
        Update: {
          calculator_id?: string
          config?: Json
          created_at?: string
          id?: string
          industry?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rr_scoring_rules_calculator_id_fkey"
            columns: ["calculator_id"]
            isOneToOne: false
            referencedRelation: "rr_calculators"
            referencedColumns: ["id"]
          },
        ]
      }
      rr_submissions: {
        Row: {
          answers: Json
          calculator_id: string
          completed_at: string
          contact: Json
          created_at: string
          device: string | null
          duration_ms: number | null
          financial_impact: Json
          id: string
          industry: string | null
          lead_id: string | null
          recommendations: Json
          referrer: string | null
          score: number | null
          score_breakdown: Json
          session_id: string | null
          slug: string
          traffic_source: string | null
          version_id: string | null
        }
        Insert: {
          answers?: Json
          calculator_id: string
          completed_at?: string
          contact?: Json
          created_at?: string
          device?: string | null
          duration_ms?: number | null
          financial_impact?: Json
          id?: string
          industry?: string | null
          lead_id?: string | null
          recommendations?: Json
          referrer?: string | null
          score?: number | null
          score_breakdown?: Json
          session_id?: string | null
          slug: string
          traffic_source?: string | null
          version_id?: string | null
        }
        Update: {
          answers?: Json
          calculator_id?: string
          completed_at?: string
          contact?: Json
          created_at?: string
          device?: string | null
          duration_ms?: number | null
          financial_impact?: Json
          id?: string
          industry?: string | null
          lead_id?: string | null
          recommendations?: Json
          referrer?: string | null
          score?: number | null
          score_breakdown?: Json
          session_id?: string | null
          slug?: string
          traffic_source?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rr_submissions_calculator_id_fkey"
            columns: ["calculator_id"]
            isOneToOne: false
            referencedRelation: "rr_calculators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rr_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rr_submissions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "rr_calculator_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rr_get_published_by_slug: {
        Args: { _slug: string }
        Returns: {
          calculator_id: string
          description: string
          industries: string[]
          key: string
          name: string
          published_at: string
          settings: Json
          slug: string
          snapshot: Json
          tagline: string
          version: number
          version_id: string
        }[]
      }
      rr_is_published: { Args: { _calculator_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin"
      resource_status: "draft" | "published"
      resource_type: "pdf" | "image" | "video" | "github" | "drive" | "website"
      rr_question_type:
        | "single_choice"
        | "multi_choice"
        | "number"
        | "currency"
        | "percentage"
        | "slider"
        | "rating"
        | "yes_no"
        | "short_text"
        | "long_text"
      rr_status: "draft" | "published" | "archived"
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
      app_role: ["admin"],
      resource_status: ["draft", "published"],
      resource_type: ["pdf", "image", "video", "github", "drive", "website"],
      rr_question_type: [
        "single_choice",
        "multi_choice",
        "number",
        "currency",
        "percentage",
        "slider",
        "rating",
        "yes_no",
        "short_text",
        "long_text",
      ],
      rr_status: ["draft", "published", "archived"],
    },
  },
} as const
