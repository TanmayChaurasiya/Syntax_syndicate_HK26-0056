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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          ack_note: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          message: string
          patient_id: string
          resolved_at: string | null
          severity: string
          status: string
          type: string
          value: number | null
          vital: string | null
        }
        Insert: {
          ack_note?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message: string
          patient_id: string
          resolved_at?: string | null
          severity: string
          status?: string
          type: string
          value?: number | null
          vital?: string | null
        }
        Update: {
          ack_note?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message?: string
          patient_id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          type?: string
          value?: number | null
          vital?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          details: Json | null
          id: string
          target: string | null
          ts: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          target?: string | null
          ts?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          target?: string | null
          ts?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      model_metrics: {
        Row: {
          baseline: Json
          created_at: string
          engine: Json
          episodes: number
          id: string
          run_by: string | null
        }
        Insert: {
          baseline: Json
          created_at?: string
          engine: Json
          episodes: number
          id?: string
          run_by?: string | null
        }
        Update: {
          baseline?: Json
          created_at?: string
          engine?: Json
          episodes?: number
          id?: string
          run_by?: string | null
        }
        Relationships: []
      }
      patient_thresholds: {
        Row: {
          hr_max: number
          hr_min: number
          patient_id: string
          spo2_min: number
          sys_max: number
          sys_min: number
          temp_max: number
          updated_at: string
        }
        Insert: {
          hr_max?: number
          hr_min?: number
          patient_id: string
          spo2_min?: number
          sys_max?: number
          sys_min?: number
          temp_max?: number
          updated_at?: string
        }
        Update: {
          hr_max?: number
          hr_min?: number
          patient_id?: string
          spo2_min?: number
          sys_max?: number
          sys_min?: number
          temp_max?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_thresholds_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          age: number
          assigned_provider_id: string | null
          baseline_dia: number
          baseline_hr: number
          baseline_spo2: number
          baseline_sys: number
          baseline_temp: number
          condition: string
          created_at: string
          id: string
          name: string
          sex: string
        }
        Insert: {
          age: number
          assigned_provider_id?: string | null
          baseline_dia: number
          baseline_hr: number
          baseline_spo2: number
          baseline_sys: number
          baseline_temp: number
          condition: string
          created_at?: string
          id?: string
          name: string
          sex: string
        }
        Update: {
          age?: number
          assigned_provider_id?: string | null
          baseline_dia?: number
          baseline_hr?: number
          baseline_spo2?: number
          baseline_sys?: number
          baseline_temp?: number
          condition?: string
          created_at?: string
          id?: string
          name?: string
          sex?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          full_name: string | null
          id: string
        }
        Insert: {
          full_name?: string | null
          id: string
        }
        Update: {
          full_name?: string | null
          id?: string
        }
        Relationships: []
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
      vitals_history: {
        Row: {
          dia: number | null
          hr: number | null
          id: number
          patient_id: string
          spo2: number | null
          sys: number | null
          temp: number | null
          ts: string
        }
        Insert: {
          dia?: number | null
          hr?: number | null
          id?: number
          patient_id: string
          spo2?: number | null
          sys?: number | null
          temp?: number | null
          ts: string
        }
        Update: {
          dia?: number | null
          hr?: number | null
          id?: number
          patient_id?: string
          spo2?: number | null
          sys?: number | null
          temp?: number | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "vitals_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_patient: { Args: { _patient_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "doctor" | "nurse" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["doctor", "nurse", "admin"],
    },
  },
} as const
