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
      activity_log: {
        Row: {
          action: string
          created_at: string
          detail: string
          id: string
          ip: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string
          id?: string
          ip?: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string
          id?: string
          ip?: string
        }
        Relationships: []
      }
      findings_v3: {
        Row: {
          created_at: string
          detalhe: string
          familia: string
          id: string
          origem: string
          payload: Json | null
          primeira_versao: number
          resolvido_na_versao: number | null
          rule_id: string
          slide_ref: string
          status: string
          study_id: string
          tipo: string
          titulo: string
          verdict: string | null
          verdict_revisado: boolean
        }
        Insert: {
          created_at?: string
          detalhe?: string
          familia: string
          id?: string
          origem?: string
          payload?: Json | null
          primeira_versao?: number
          resolvido_na_versao?: number | null
          rule_id: string
          slide_ref: string
          status?: string
          study_id: string
          tipo: string
          titulo: string
          verdict?: string | null
          verdict_revisado?: boolean
        }
        Update: {
          created_at?: string
          detalhe?: string
          familia?: string
          id?: string
          origem?: string
          payload?: Json | null
          primeira_versao?: number
          resolvido_na_versao?: number | null
          rule_id?: string
          slide_ref?: string
          status?: string
          study_id?: string
          tipo?: string
          titulo?: string
          verdict?: string | null
          verdict_revisado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "findings_v3_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_passes: {
        Row: {
          created_at: string
          custo_usd: number
          escopo: string | null
          id: string
          input_tokens: number
          output_tokens: number
          study_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          custo_usd?: number
          escopo?: string | null
          id?: string
          input_tokens?: number
          output_tokens?: number
          study_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          custo_usd?: number
          escopo?: string | null
          id?: string
          input_tokens?: number
          output_tokens?: number
          study_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_passes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          city_name: string
          id: string
          model: string
          project_name: string
          radii: string
          report_text: string
          reviewed_at: string | null
          saved_at: string
          slides_error: number
          slides_ok: number
          slides_skipped: number
          slides_with_errors: number
          total_cost: number
          total_errors: number
          total_input_tokens: number
          total_output_tokens: number
          total_slides: number
        }
        Insert: {
          city_name: string
          id?: string
          model: string
          project_name: string
          radii: string
          report_text?: string
          reviewed_at?: string | null
          saved_at?: string
          slides_error?: number
          slides_ok?: number
          slides_skipped?: number
          slides_with_errors?: number
          total_cost?: number
          total_errors?: number
          total_input_tokens?: number
          total_output_tokens?: number
          total_slides?: number
        }
        Update: {
          city_name?: string
          id?: string
          model?: string
          project_name?: string
          radii?: string
          report_text?: string
          reviewed_at?: string | null
          saved_at?: string
          slides_error?: number
          slides_ok?: number
          slides_skipped?: number
          slides_with_errors?: number
          total_cost?: number
          total_errors?: number
          total_input_tokens?: number
          total_output_tokens?: number
          total_slides?: number
        }
        Relationships: []
      }
      slide_errors: {
        Row: {
          description: string
          id: string
          location: string
          severity: string
          slide_id: string
          type: string
          verdict: string | null
        }
        Insert: {
          description: string
          id?: string
          location?: string
          severity: string
          slide_id: string
          type: string
          verdict?: string | null
        }
        Update: {
          description?: string
          id?: string
          location?: string
          severity?: string
          slide_id?: string
          type?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slide_errors_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "slides"
            referencedColumns: ["id"]
          },
        ]
      }
      slides: {
        Row: {
          cost: number
          has_data: boolean
          id: string
          image_path: string | null
          input_tokens: number
          output_tokens: number
          project_id: string
          slide_number: number
          status: string
          summary: string
        }
        Insert: {
          cost?: number
          has_data?: boolean
          id?: string
          image_path?: string | null
          input_tokens?: number
          output_tokens?: number
          project_id: string
          slide_number: number
          status: string
          summary?: string
        }
        Update: {
          cost?: number
          has_data?: boolean
          id?: string
          image_path?: string | null
          input_tokens?: number
          output_tokens?: number
          project_id?: string
          slide_number?: number
          status?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "slides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studies_v3: {
        Row: {
          ata: Json | null
          ata_confirmada: boolean
          cidade: string | null
          concluded_at: string | null
          created_at: string
          custo_total: number
          id: string
          nome: string
          status: string
          uf: string | null
        }
        Insert: {
          ata?: Json | null
          ata_confirmada?: boolean
          cidade?: string | null
          concluded_at?: string | null
          created_at?: string
          custo_total?: number
          id?: string
          nome: string
          status?: string
          uf?: string | null
        }
        Update: {
          ata?: Json | null
          ata_confirmada?: boolean
          cidade?: string | null
          concluded_at?: string | null
          created_at?: string
          custo_total?: number
          id?: string
          nome?: string
          status?: string
          uf?: string | null
        }
        Relationships: []
      }
      study_versions: {
        Row: {
          arquivo: string | null
          created_at: string
          id: string
          n: number
          n_slides: number
          sha1: string | null
          study_id: string
        }
        Insert: {
          arquivo?: string | null
          created_at?: string
          id?: string
          n: number
          n_slides?: number
          sha1?: string | null
          study_id: string
        }
        Update: {
          arquivo?: string | null
          created_at?: string
          id?: string
          n?: number
          n_slides?: number
          sha1?: string | null
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_versions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_cache: {
        Row: {
          created_at: string
          input_tokens: number
          model: string | null
          output_tokens: number
          payload: Json
          schema_version: number
          sha1: string
        }
        Insert: {
          created_at?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          payload: Json
          schema_version?: number
          sha1: string
        }
        Update: {
          created_at?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          payload?: Json
          schema_version?: number
          sha1?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
