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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_logs: {
        Row: {
          action: string
          agent_name: string
          confidence_score: number | null
          created_at: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          reasoning: string | null
          session_id: string | null
        }
        Insert: {
          action: string
          agent_name: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          reasoning?: string | null
          session_id?: string | null
        }
        Update: {
          action?: string
          agent_name?: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          reasoning?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string
          facility_id: string
          id: string
          notes: string | null
          patient_name: string
          patient_phone: string
          purpose: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string
          facility_id: string
          id?: string
          notes?: string | null
          patient_name: string
          patient_phone: string
          purpose: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          facility_id?: string
          id?: string
          notes?: string | null
          patient_name?: string
          patient_phone?: string
          purpose?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      doctor_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "doctor_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string
          available_beds: number | null
          city: string
          created_at: string | null
          current_wait_time: number | null
          has_lab: boolean | null
          has_xray: boolean | null
          hours: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          name_ur: string | null
          phone: string | null
          rating: number | null
          specialties: string[] | null
          type: string
        }
        Insert: {
          address: string
          available_beds?: number | null
          city: string
          created_at?: string | null
          current_wait_time?: number | null
          has_lab?: boolean | null
          has_xray?: boolean | null
          hours?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          name_ur?: string | null
          phone?: string | null
          rating?: number | null
          specialties?: string[] | null
          type: string
        }
        Update: {
          address?: string
          available_beds?: number | null
          city?: string
          created_at?: string | null
          current_wait_time?: number | null
          has_lab?: boolean | null
          has_xray?: boolean | null
          hours?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_ur?: string | null
          phone?: string | null
          rating?: number | null
          specialties?: string[] | null
          type?: string
        }
        Relationships: []
      }
      health_records: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          doctor_name: string | null
          document_url: string | null
          facility_name: string | null
          id: string
          metadata: Json | null
          record_type: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          description?: string | null
          doctor_name?: string | null
          document_url?: string | null
          facility_name?: string | null
          id?: string
          metadata?: Json | null
          record_type: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          doctor_name?: string | null
          document_url?: string | null
          facility_name?: string | null
          id?: string
          metadata?: Json | null
          record_type?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      medication_reminders: {
        Row: {
          created_at: string
          custom_times: string[] | null
          facility_name: string | null
          frequency: string
          id: string
          is_active: boolean
          medication_name: string | null
          next_reminder: string
          phone_number: string | null
          reasoning: string | null
          reminder_type: string
          schedule: string
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_times?: string[] | null
          facility_name?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          medication_name?: string | null
          next_reminder: string
          phone_number?: string | null
          reasoning?: string | null
          reminder_type: string
          schedule: string
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_times?: string[] | null
          facility_name?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          medication_name?: string | null
          next_reminder?: string
          phone_number?: string | null
          reasoning?: string | null
          reminder_type?: string
          schedule?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medicines: {
        Row: {
          available: boolean
          brand: string
          category: string
          created_at: string
          description: string | null
          dosage_form: string
          generic_name: string | null
          id: string
          manufacturer: string | null
          name: string
          prescription_required: boolean
          price_pkr: number
          strength: string | null
          updated_at: string
        }
        Insert: {
          available?: boolean
          brand: string
          category: string
          created_at?: string
          description?: string | null
          dosage_form: string
          generic_name?: string | null
          id?: string
          manufacturer?: string | null
          name: string
          prescription_required?: boolean
          price_pkr: number
          strength?: string | null
          updated_at?: string
        }
        Update: {
          available?: boolean
          brand?: string
          category?: string
          created_at?: string
          description?: string | null
          dosage_form?: string
          generic_name?: string | null
          id?: string
          manufacturer?: string | null
          name?: string
          prescription_required?: boolean
          price_pkr?: number
          strength?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outbreak_forecasts: {
        Row: {
          ai_analysis: string | null
          city: string | null
          confidence_score: number
          contributing_factors: string[] | null
          created_at: string
          disease_name: string
          forecast_date: string
          id: string
          metadata: Json | null
          predicted_cases: number
          recommendation: string | null
          risk_level: string
          trend: string
        }
        Insert: {
          ai_analysis?: string | null
          city?: string | null
          confidence_score?: number
          contributing_factors?: string[] | null
          created_at?: string
          disease_name: string
          forecast_date: string
          id?: string
          metadata?: Json | null
          predicted_cases?: number
          recommendation?: string | null
          risk_level?: string
          trend?: string
        }
        Update: {
          ai_analysis?: string | null
          city?: string | null
          confidence_score?: number
          contributing_factors?: string[] | null
          created_at?: string
          disease_name?: string
          forecast_date?: string
          id?: string
          metadata?: Json | null
          predicted_cases?: number
          recommendation?: string | null
          risk_level?: string
          trend?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string | null
          full_name: string
          id: string
          language: string | null
          notification_email: boolean | null
          notification_push: boolean | null
          notification_sms: boolean | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          full_name: string
          id: string
          language?: string | null
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          language?: string | null
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sehat_cards: {
        Row: {
          city: string
          cnic: string
          created_at: string | null
          eligibility_status: string
          father_name: string
          id: string
          income_group: string
          past_diseases: string[] | null
          remaining_credits: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          city: string
          cnic: string
          created_at?: string | null
          eligibility_status: string
          father_name: string
          id?: string
          income_group: string
          past_diseases?: string[] | null
          remaining_credits?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string
          cnic?: string
          created_at?: string | null
          eligibility_status?: string
          father_name?: string
          id?: string
          income_group?: string
          past_diseases?: string[] | null
          remaining_credits?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      surveillance_alerts: {
        Row: {
          ai_assessment: string | null
          alert_type: string
          case_count: number
          city: string | null
          confidence_score: number
          created_at: string
          disease_name: string
          id: string
          metadata: Json | null
          percentage: number
          recommendation: string | null
          resolved_at: string | null
          severity: string
          status: string
        }
        Insert: {
          ai_assessment?: string | null
          alert_type: string
          case_count?: number
          city?: string | null
          confidence_score?: number
          created_at?: string
          disease_name: string
          id?: string
          metadata?: Json | null
          percentage?: number
          recommendation?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
        }
        Update: {
          ai_assessment?: string | null
          alert_type?: string
          case_count?: number
          city?: string | null
          confidence_score?: number
          created_at?: string
          disease_name?: string
          id?: string
          metadata?: Json | null
          percentage?: number
          recommendation?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
        }
        Relationships: []
      }
      triage_conversations: {
        Row: {
          created_at: string | null
          id: string
          language: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          language?: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      triage_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "triage_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "triage_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_sessions: {
        Row: {
          ai_recommendation: string | null
          completed_at: string | null
          created_at: string | null
          facility_suggested: string | null
          id: string
          session_data: Json | null
          status: string | null
          symptoms: string
          urgency_level: string | null
          user_id: string | null
        }
        Insert: {
          ai_recommendation?: string | null
          completed_at?: string | null
          created_at?: string | null
          facility_suggested?: string | null
          id?: string
          session_data?: Json | null
          status?: string | null
          symptoms: string
          urgency_level?: string | null
          user_id?: string | null
        }
        Update: {
          ai_recommendation?: string | null
          completed_at?: string | null
          created_at?: string | null
          facility_suggested?: string | null
          id?: string
          session_data?: Json | null
          status?: string | null
          symptoms?: string
          urgency_level?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "triage_sessions_facility_suggested_fkey"
            columns: ["facility_suggested"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "citizen" | "doctor" | "lhw" | "admin"
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
      app_role: ["citizen", "doctor", "lhw", "admin"],
    },
  },
} as const
