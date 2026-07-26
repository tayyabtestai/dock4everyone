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
      assessment_events: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          session_id: string | null
          step_index: number | null
          type: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          session_id?: string | null
          step_index?: number | null
          type: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          session_id?: string | null
          step_index?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_events_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_submissions: {
        Row: {
          answers: Json
          assessment_id: string
          browser: string | null
          completed: boolean
          computed: Json
          country: string | null
          created_at: string
          device: string | null
          duration_seconds: number | null
          id: string
          ip_address: string | null
          landing_page: string | null
          lead_id: string | null
          recommendations: Json
          referrer: string | null
          score: number | null
          user_agent: string | null
          utm: Json
        }
        Insert: {
          answers?: Json
          assessment_id: string
          browser?: string | null
          completed?: boolean
          computed?: Json
          country?: string | null
          created_at?: string
          device?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          landing_page?: string | null
          lead_id?: string | null
          recommendations?: Json
          referrer?: string | null
          score?: number | null
          user_agent?: string | null
          utm?: Json
        }
        Update: {
          answers?: Json
          assessment_id?: string
          browser?: string | null
          completed?: boolean
          computed?: Json
          country?: string | null
          created_at?: string
          device?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          landing_page?: string | null
          lead_id?: string | null
          recommendations?: Json
          referrer?: string | null
          score?: number | null
          user_agent?: string | null
          utm?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_templates: {
        Row: {
          ai_recommendations: Json
          created_at: string
          description: string
          formulas: Json
          id: string
          industry: string
          name: string
          questions: Json
          result_config: Json
          updated_at: string
        }
        Insert: {
          ai_recommendations?: Json
          created_at?: string
          description?: string
          formulas?: Json
          id?: string
          industry?: string
          name: string
          questions?: Json
          result_config?: Json
          updated_at?: string
        }
        Update: {
          ai_recommendations?: Json
          created_at?: string
          description?: string
          formulas?: Json
          id?: string
          industry?: string
          name?: string
          questions?: Json
          result_config?: Json
          updated_at?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          ai_recommendations: Json
          created_at: string
          description: string
          estimated_minutes: number
          featured_image_url: string
          formulas: Json
          headline: string
          id: string
          industry: string
          lead_fields: Json
          name: string
          og_image_url: string
          primary_cta_label: string
          primary_cta_url: string
          questions: Json
          result_config: Json
          secondary_cta_label: string
          secondary_cta_url: string
          seo_description: string
          seo_title: string
          slug: string
          status: Database["public"]["Enums"]["assessment_status"]
          subheadline: string
          updated_at: string
        }
        Insert: {
          ai_recommendations?: Json
          created_at?: string
          description?: string
          estimated_minutes?: number
          featured_image_url?: string
          formulas?: Json
          headline?: string
          id?: string
          industry?: string
          lead_fields?: Json
          name?: string
          og_image_url?: string
          primary_cta_label?: string
          primary_cta_url?: string
          questions?: Json
          result_config?: Json
          secondary_cta_label?: string
          secondary_cta_url?: string
          seo_description?: string
          seo_title?: string
          slug: string
          status?: Database["public"]["Enums"]["assessment_status"]
          subheadline?: string
          updated_at?: string
        }
        Update: {
          ai_recommendations?: Json
          created_at?: string
          description?: string
          estimated_minutes?: number
          featured_image_url?: string
          formulas?: Json
          headline?: string
          id?: string
          industry?: string
          lead_fields?: Json
          name?: string
          og_image_url?: string
          primary_cta_label?: string
          primary_cta_url?: string
          questions?: Json
          result_config?: Json
          secondary_cta_label?: string
          secondary_cta_url?: string
          seo_description?: string
          seo_title?: string
          slug?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          subheadline?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          email: string
          full_name: string
          id: string
          ip_address: string | null
          phone: string | null
          platform: string
          resource_id: string | null
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          email: string
          full_name: string
          id?: string
          ip_address?: string | null
          phone?: string | null
          platform: string
          resource_id?: string | null
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          email?: string
          full_name?: string
          id?: string
          ip_address?: string | null
          phone?: string | null
          platform?: string
          resource_id?: string | null
          user_agent?: string | null
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
    }
    Enums: {
      app_role: "admin"
      assessment_status: "draft" | "published" | "archived"
      resource_status: "draft" | "published"
      resource_type: "pdf" | "image" | "video" | "github" | "drive" | "website"
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
      assessment_status: ["draft", "published", "archived"],
      resource_status: ["draft", "published"],
      resource_type: ["pdf", "image", "video", "github", "drive", "website"],
    },
  },
} as const
