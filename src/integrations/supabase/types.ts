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
      corretor_analysis_snapshots: {
        Row: {
          created_at: string
          created_by: string
          findings: Json
          id: string
          reason: string
          report: Json | null
          source_scope: string
          source_set_id: string | null
          study_id: string
          version_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          findings: Json
          id?: string
          reason: string
          report?: Json | null
          source_scope: string
          source_set_id?: string | null
          study_id: string
          version_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          findings?: Json
          id?: string
          reason?: string
          report?: Json | null
          source_scope?: string
          source_set_id?: string | null
          study_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_analysis_snapshots_source_set_id_fkey"
            columns: ["source_set_id"]
            isOneToOne: false
            referencedRelation: "corretor_source_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_analysis_snapshots_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_analysis_snapshots_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "study_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_execution_batches: {
        Row: {
          batch_hash: string
          cost_usd: number | null
          created_at: string
          execution_id: string
          function_name: string
          reserved_usd: number
          response: Json | null
          state: string
        }
        Insert: {
          batch_hash: string
          cost_usd?: number | null
          created_at?: string
          execution_id: string
          function_name: string
          reserved_usd: number
          response?: Json | null
          state: string
        }
        Update: {
          batch_hash?: string
          cost_usd?: number | null
          created_at?: string
          execution_id?: string
          function_name?: string
          reserved_usd?: number
          response?: Json | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_execution_batches_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "corretor_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_executions: {
        Row: {
          budget_usd: number
          confirmed_context: Json
          context_hash: string
          created_at: string
          document_sha1: string
          engine: string
          estimated_usd: number | null
          id: string
          owner_hash: string
          purpose: string
          reserved_usd: number
          spent_usd: number
          state: string
          study_id: string
          updated_at: string
          validation_budget_id: string | null
          version_n: number
        }
        Insert: {
          budget_usd: number
          confirmed_context?: Json
          context_hash: string
          created_at?: string
          document_sha1: string
          engine?: string
          estimated_usd?: number | null
          id?: string
          owner_hash: string
          purpose?: string
          reserved_usd?: number
          spent_usd?: number
          state?: string
          study_id: string
          updated_at?: string
          validation_budget_id?: string | null
          version_n: number
        }
        Update: {
          budget_usd?: number
          confirmed_context?: Json
          context_hash?: string
          created_at?: string
          document_sha1?: string
          engine?: string
          estimated_usd?: number | null
          id?: string
          owner_hash?: string
          purpose?: string
          reserved_usd?: number
          spent_usd?: number
          state?: string
          study_id?: string
          updated_at?: string
          validation_budget_id?: string | null
          version_n?: number
        }
        Relationships: [
          {
            foreignKeyName: "corretor_executions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_executions_validation_budget_id_fkey"
            columns: ["validation_budget_id"]
            isOneToOne: false
            referencedRelation: "corretor_review_validation_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_material_assets: {
        Row: {
          bytes: number
          created_at: string
          created_by: string
          id: string
          kind: string
          original_name: string
          path: string
          sha1: string | null
          sha256: string
          slide_n: number | null
          study_id: string
          version_id: string
        }
        Insert: {
          bytes: number
          created_at?: string
          created_by?: string
          id?: string
          kind: string
          original_name: string
          path: string
          sha1?: string | null
          sha256: string
          slide_n?: number | null
          study_id: string
          version_id: string
        }
        Update: {
          bytes?: number
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          original_name?: string
          path?: string
          sha1?: string | null
          sha256?: string
          slide_n?: number | null
          study_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_material_assets_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_material_assets_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "study_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_originals: {
        Row: {
          bytes: number
          created_at: string
          id: string
          original_name: string
          path: string
          project_id: string
          sha1: string
          sha256: string
          version_id: string
        }
        Insert: {
          bytes: number
          created_at?: string
          id?: string
          original_name: string
          path: string
          project_id: string
          sha1: string
          sha256: string
          version_id: string
        }
        Update: {
          bytes?: number
          created_at?: string
          id?: string
          original_name?: string
          path?: string
          project_id?: string
          sha1?: string
          sha256?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_originals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "corretor_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_originals_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "study_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_project_members: {
        Row: {
          owner_id: string
          project_id: string
          user_id: string
        }
        Insert: {
          owner_id: string
          project_id: string
          user_id: string
        }
        Update: {
          owner_id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "corretor_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_project_members_project_id_owner_id_fkey"
            columns: ["project_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "corretor_projects"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      corretor_projects: {
        Row: {
          analyst: string
          city: string
          client_name: string
          created_at: string
          display_name: string
          due_date: string | null
          id: string
          notes: string
          owner_id: string
          reference_period: string
          reviewer: string
          study_id: string | null
          study_type: string
          uf: string
          updated_at: string
        }
        Insert: {
          analyst?: string
          city?: string
          client_name?: string
          created_at?: string
          display_name: string
          due_date?: string | null
          id?: string
          notes?: string
          owner_id: string
          reference_period?: string
          reviewer?: string
          study_id?: string | null
          study_type?: string
          uf?: string
          updated_at?: string
        }
        Update: {
          analyst?: string
          city?: string
          client_name?: string
          created_at?: string
          display_name?: string
          due_date?: string | null
          id?: string
          notes?: string
          owner_id?: string
          reference_period?: string
          reviewer?: string
          study_id?: string | null
          study_type?: string
          uf?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_projects_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_recommendations: {
        Row: {
          budget_usd: number
          cached_tokens: number
          completed_at: string | null
          config_version: string | null
          content: string | null
          coverage: Json
          created_at: string
          document_sha1: string
          endpoint: string | null
          error_message: string | null
          estimated_usd: number
          execution_id: string
          has_truncated_memo: boolean
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          price_version: string
          pricing_snapshot: Json | null
          profile_id: string | null
          prompt_version: string
          provider_calls: number
          provider_latency_ms: number
          reasoning_effort: string | null
          reasoning_reported_calls: number
          reasoning_tokens: number | null
          reserved_usd: number
          service_tier: string | null
          spent_usd: number
          state: string
          study_id: string
          total_requests: number
          updated_at: string
          usage_origin: string | null
          version_id: string
          version_n: number
        }
        Insert: {
          budget_usd: number
          cached_tokens?: number
          completed_at?: string | null
          config_version?: string | null
          content?: string | null
          coverage: Json
          created_at?: string
          document_sha1: string
          endpoint?: string | null
          error_message?: string | null
          estimated_usd: number
          execution_id: string
          has_truncated_memo?: boolean
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          price_version: string
          pricing_snapshot?: Json | null
          profile_id?: string | null
          prompt_version: string
          provider_calls?: number
          provider_latency_ms?: number
          reasoning_effort?: string | null
          reasoning_reported_calls?: number
          reasoning_tokens?: number | null
          reserved_usd?: number
          service_tier?: string | null
          spent_usd?: number
          state?: string
          study_id: string
          total_requests: number
          updated_at?: string
          usage_origin?: string | null
          version_id: string
          version_n: number
        }
        Update: {
          budget_usd?: number
          cached_tokens?: number
          completed_at?: string | null
          config_version?: string | null
          content?: string | null
          coverage?: Json
          created_at?: string
          document_sha1?: string
          endpoint?: string | null
          error_message?: string | null
          estimated_usd?: number
          execution_id?: string
          has_truncated_memo?: boolean
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          price_version?: string
          pricing_snapshot?: Json | null
          profile_id?: string | null
          prompt_version?: string
          provider_calls?: number
          provider_latency_ms?: number
          reasoning_effort?: string | null
          reasoning_reported_calls?: number
          reasoning_tokens?: number | null
          reserved_usd?: number
          service_tier?: string | null
          spent_usd?: number
          state?: string
          study_id?: string
          total_requests?: number
          updated_at?: string
          usage_origin?: string | null
          version_id?: string
          version_n?: number
        }
        Relationships: [
          {
            foreignKeyName: "corretor_recommendations_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: true
            referencedRelation: "corretor_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_recommendations_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_recommendations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "study_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_review_validation_budgets: {
        Row: {
          budget_usd: number
          created_at: string
          id: string
        }
        Insert: {
          budget_usd: number
          created_at?: string
          id: string
        }
        Update: {
          budget_usd?: number
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      corretor_review_validation_studies: {
        Row: {
          budget_id: string
          owner_hash: string
          study_id: string
        }
        Insert: {
          budget_id: string
          owner_hash: string
          study_id: string
        }
        Update: {
          budget_id?: string
          owner_hash?: string
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_review_validation_studies_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "corretor_review_validation_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_review_validation_studies_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_source_sets: {
        Row: {
          created_at: string
          created_by: string
          file_ids: string[]
          fingerprint: string
          id: string
          payload: Json
          study_id: string
          version_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          file_ids: string[]
          fingerprint: string
          id?: string
          payload: Json
          study_id: string
          version_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          file_ids?: string[]
          fingerprint?: string
          id?: string
          payload?: Json
          study_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_source_sets_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corretor_source_sets_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "study_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      corretor_study_shares: {
        Row: {
          created_at: string
          shared_by: string
          study_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          shared_by?: string
          study_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          shared_by?: string
          study_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corretor_study_shares_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_estab_manifesto: {
        Row: {
          bytes_processados: number | null
          competencia: string
          empresas_particao: string
          erro_codigo: string | null
          estabelecimentos_particao: string
          fonte: string
          gerado_em: string
          id: string
          id_municipio: string
          linhas_geradas: number | null
          methodology_version: string
          origem_empresas_bytes: number | null
          origem_empresas_linhas: number | null
          origem_empresas_modificado_em: string | null
          origem_estabelecimentos_bytes: number | null
          origem_estabelecimentos_linhas: number | null
          origem_estabelecimentos_modificado_em: string | null
          publicado_em: string | null
          query_version: string
          simples_lido_em: string | null
          status: string
        }
        Insert: {
          bytes_processados?: number | null
          competencia: string
          empresas_particao: string
          erro_codigo?: string | null
          estabelecimentos_particao: string
          fonte?: string
          gerado_em?: string
          id?: string
          id_municipio: string
          linhas_geradas?: number | null
          methodology_version: string
          origem_empresas_bytes?: number | null
          origem_empresas_linhas?: number | null
          origem_empresas_modificado_em?: string | null
          origem_estabelecimentos_bytes?: number | null
          origem_estabelecimentos_linhas?: number | null
          origem_estabelecimentos_modificado_em?: string | null
          publicado_em?: string | null
          query_version: string
          simples_lido_em?: string | null
          status?: string
        }
        Update: {
          bytes_processados?: number | null
          competencia?: string
          empresas_particao?: string
          erro_codigo?: string | null
          estabelecimentos_particao?: string
          fonte?: string
          gerado_em?: string
          id?: string
          id_municipio?: string
          linhas_geradas?: number | null
          methodology_version?: string
          origem_empresas_bytes?: number | null
          origem_empresas_linhas?: number | null
          origem_empresas_modificado_em?: string | null
          origem_estabelecimentos_bytes?: number | null
          origem_estabelecimentos_linhas?: number | null
          origem_estabelecimentos_modificado_em?: string | null
          publicado_em?: string | null
          query_version?: string
          simples_lido_em?: string | null
          status?: string
        }
        Relationships: []
      }
      empresas_estab_municipio: {
        Row: {
          cnae_secao: string
          id_municipio: string
          manifesto_id: string
          matriz_filial: number
          porte: string
          quantidade: number
          regime_simples: string
        }
        Insert: {
          cnae_secao: string
          id_municipio: string
          manifesto_id: string
          matriz_filial: number
          porte: string
          quantidade: number
          regime_simples: string
        }
        Update: {
          cnae_secao?: string
          id_municipio?: string
          manifesto_id?: string
          matriz_filial?: number
          porte?: string
          quantidade?: number
          regime_simples?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_estab_municipio_manifesto_id_fkey"
            columns: ["manifesto_id"]
            isOneToOne: false
            referencedRelation: "empresas_estab_manifesto"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_materialize_pedido: {
        Row: {
          competencia: string
          created_at: string
          id: string
          id_municipio: string
          ip_hash: string
          status: string
          updated_at: string
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          id_municipio: string
          ip_hash: string
          status?: string
          updated_at?: string
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          id_municipio?: string
          ip_hash?: string
          status?: string
          updated_at?: string
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
          batch_hash: string | null
          cached_tokens: number
          config_version: string | null
          created_at: string
          custo_usd: number
          escopo: string | null
          execution_id: string | null
          extraction_version: string | null
          finish_reason: string | null
          id: string
          input_tokens: number
          latency_ms: number | null
          model: string | null
          output_tokens: number
          price_version: string | null
          pricing_snapshot: Json | null
          profile_id: string | null
          prompt_hash: string | null
          prompt_version: string | null
          provider_request_id: string | null
          reasoning_effort: string | null
          reasoning_tokens: number | null
          requested_model: string | null
          requested_service_tier: string | null
          rules_version: string | null
          service_tier: string | null
          study_id: string
          tipo: string
          usage_origin: string | null
        }
        Insert: {
          batch_hash?: string | null
          cached_tokens?: number
          config_version?: string | null
          created_at?: string
          custo_usd?: number
          escopo?: string | null
          execution_id?: string | null
          extraction_version?: string | null
          finish_reason?: string | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number
          price_version?: string | null
          pricing_snapshot?: Json | null
          profile_id?: string | null
          prompt_hash?: string | null
          prompt_version?: string | null
          provider_request_id?: string | null
          reasoning_effort?: string | null
          reasoning_tokens?: number | null
          requested_model?: string | null
          requested_service_tier?: string | null
          rules_version?: string | null
          service_tier?: string | null
          study_id: string
          tipo: string
          usage_origin?: string | null
        }
        Update: {
          batch_hash?: string | null
          cached_tokens?: number
          config_version?: string | null
          created_at?: string
          custo_usd?: number
          escopo?: string | null
          execution_id?: string | null
          extraction_version?: string | null
          finish_reason?: string | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number
          price_version?: string | null
          pricing_snapshot?: Json | null
          profile_id?: string | null
          prompt_hash?: string | null
          prompt_version?: string | null
          provider_request_id?: string | null
          reasoning_effort?: string | null
          reasoning_tokens?: number | null
          requested_model?: string | null
          requested_service_tier?: string | null
          rules_version?: string | null
          service_tier?: string | null
          study_id?: string
          tipo?: string
          usage_origin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_passes_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "corretor_executions"
            referencedColumns: ["id"]
          },
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
      rais_employee_history_points: {
        Row: {
          active_employees: number
          created_at: string
          id: string
          snapshot_id: string
          year: number
        }
        Insert: {
          active_employees: number
          created_at?: string
          id?: string
          snapshot_id: string
          year: number
        }
        Update: {
          active_employees?: number
          created_at?: string
          id?: string
          snapshot_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "rais_employee_history_points_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "rais_employee_history_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      rais_employee_history_query_runs: {
        Row: {
          application_version: string
          bigquery_job_ids: string[]
          bytes_billed: number | null
          bytes_processed: number | null
          cache_hit: boolean
          created_at: string
          duration_ms: number | null
          error_code: string | null
          id: string
          ip_hash: string | null
          municipality_ibge: string
          query_version: string
          requester_email: string | null
          requester_id: string
          snapshot_id: string | null
          status: string
          uf: string
        }
        Insert: {
          application_version?: string
          bigquery_job_ids?: string[]
          bytes_billed?: number | null
          bytes_processed?: number | null
          cache_hit?: boolean
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          ip_hash?: string | null
          municipality_ibge: string
          query_version: string
          requester_email?: string | null
          requester_id: string
          snapshot_id?: string | null
          status?: string
          uf: string
        }
        Update: {
          application_version?: string
          bigquery_job_ids?: string[]
          bytes_billed?: number | null
          bytes_processed?: number | null
          cache_hit?: boolean
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          ip_hash?: string | null
          municipality_ibge?: string
          query_version?: string
          requester_email?: string | null
          requester_id?: string
          snapshot_id?: string | null
          status?: string
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "rais_employee_history_query_runs_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "rais_employee_history_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      rais_employee_history_snapshots: {
        Row: {
          attempt_count: number
          bytes_processed: number | null
          created_at: string
          first_year: number
          id: string
          last_error_code: string | null
          last_year: number
          lease_expires_at: string | null
          methodology_version: string
          municipality_ibge: string
          municipality_name: string
          point_count: number
          query_duration_ms: number | null
          query_version: string
          source: string
          status: string
          uf: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          bytes_processed?: number | null
          created_at?: string
          first_year?: number
          id?: string
          last_error_code?: string | null
          last_year?: number
          lease_expires_at?: string | null
          methodology_version: string
          municipality_ibge: string
          municipality_name: string
          point_count?: number
          query_duration_ms?: number | null
          query_version: string
          source: string
          status?: string
          uf: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          bytes_processed?: number | null
          created_at?: string
          first_year?: number
          id?: string
          last_error_code?: string | null
          last_year?: number
          lease_expires_at?: string | null
          methodology_version?: string
          municipality_ibge?: string
          municipality_name?: string
          point_count?: number
          query_duration_ms?: number | null
          query_version?: string
          source?: string
          status?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      rais_employee_occupations: {
        Row: {
          average_salary: number | null
          code: string
          created_at: string
          employees: number
          family: string
          id: string
          major_group: string
          median_salary: number | null
          occupation: string
          percentage: number
          snapshot_id: string
        }
        Insert: {
          average_salary?: number | null
          code: string
          created_at?: string
          employees?: number
          family: string
          id?: string
          major_group: string
          median_salary?: number | null
          occupation: string
          percentage?: number
          snapshot_id: string
        }
        Update: {
          average_salary?: number | null
          code?: string
          created_at?: string
          employees?: number
          family?: string
          id?: string
          major_group?: string
          median_salary?: number | null
          occupation?: string
          percentage?: number
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rais_employee_occupations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "rais_employee_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      rais_employee_query_runs: {
        Row: {
          application_version: string
          bigquery_job_ids: string[]
          bytes_billed: number | null
          bytes_processed: number | null
          cache_hit: boolean
          created_at: string
          duration_ms: number | null
          error_code: string | null
          id: string
          ip_hash: string | null
          municipality_ibge: string
          query_version: string
          requester_email: string | null
          requester_id: string
          snapshot_id: string | null
          status: string
          uf: string
          year: number
        }
        Insert: {
          application_version?: string
          bigquery_job_ids?: string[]
          bytes_billed?: number | null
          bytes_processed?: number | null
          cache_hit?: boolean
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          ip_hash?: string | null
          municipality_ibge: string
          query_version: string
          requester_email?: string | null
          requester_id: string
          snapshot_id?: string | null
          status?: string
          uf: string
          year: number
        }
        Update: {
          application_version?: string
          bigquery_job_ids?: string[]
          bytes_billed?: number | null
          bytes_processed?: number | null
          cache_hit?: boolean
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          ip_hash?: string | null
          municipality_ibge?: string
          query_version?: string
          requester_email?: string | null
          requester_id?: string
          snapshot_id?: string | null
          status?: string
          uf?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "rais_employee_query_runs_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "rais_employee_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      rais_employee_sectors: {
        Row: {
          average_salary: number | null
          code: string
          created_at: string
          employees: number
          id: string
          median_salary: number | null
          name: string
          percentage: number
          snapshot_id: string
        }
        Insert: {
          average_salary?: number | null
          code: string
          created_at?: string
          employees?: number
          id?: string
          median_salary?: number | null
          name: string
          percentage?: number
          snapshot_id: string
        }
        Update: {
          average_salary?: number | null
          code?: string
          created_at?: string
          employees?: number
          id?: string
          median_salary?: number | null
          name?: string
          percentage?: number
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rais_employee_sectors_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "rais_employee_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      rais_employee_snapshots: {
        Row: {
          attempt_count: number
          average_salary: number | null
          bytes_processed: number | null
          created_at: string
          id: string
          last_error_code: string | null
          lease_expires_at: string | null
          median_salary: number | null
          methodology_version: string
          missing_cbo: number
          municipality_ibge: string
          municipality_name: string
          query_duration_ms: number | null
          query_version: string
          salary_missing_or_zero: number
          source: string
          status: string
          total_employees: number
          total_links_in_year: number | null
          uf: string
          updated_at: string
          year: number
        }
        Insert: {
          attempt_count?: number
          average_salary?: number | null
          bytes_processed?: number | null
          created_at?: string
          id?: string
          last_error_code?: string | null
          lease_expires_at?: string | null
          median_salary?: number | null
          methodology_version: string
          missing_cbo?: number
          municipality_ibge: string
          municipality_name: string
          query_duration_ms?: number | null
          query_version: string
          salary_missing_or_zero?: number
          source: string
          status?: string
          total_employees?: number
          total_links_in_year?: number | null
          uf: string
          updated_at?: string
          year: number
        }
        Update: {
          attempt_count?: number
          average_salary?: number | null
          bytes_processed?: number | null
          created_at?: string
          id?: string
          last_error_code?: string | null
          lease_expires_at?: string | null
          median_salary?: number | null
          methodology_version?: string
          missing_cbo?: number
          municipality_ibge?: string
          municipality_name?: string
          query_duration_ms?: number | null
          query_version?: string
          salary_missing_or_zero?: number
          source?: string
          status?: string
          total_employees?: number
          total_links_in_year?: number | null
          uf?: string
          updated_at?: string
          year?: number
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
          created_by: string | null
          custo_total: number
          deleted_at: string | null
          deleted_by: string | null
          generation: string
          id: string
          nome: string
          relatorio: Json | null
          status: string
          uf: string | null
        }
        Insert: {
          ata?: Json | null
          ata_confirmada?: boolean
          cidade?: string | null
          concluded_at?: string | null
          created_at?: string
          created_by?: string | null
          custo_total?: number
          deleted_at?: string | null
          deleted_by?: string | null
          generation?: string
          id?: string
          nome: string
          relatorio?: Json | null
          status?: string
          uf?: string | null
        }
        Update: {
          ata?: Json | null
          ata_confirmada?: boolean
          cidade?: string | null
          concluded_at?: string | null
          created_at?: string
          created_by?: string | null
          custo_total?: number
          deleted_at?: string | null
          deleted_by?: string | null
          generation?: string
          id?: string
          nome?: string
          relatorio?: Json | null
          status?: string
          uf?: string | null
        }
        Relationships: []
      }
      study_sources_v3: {
        Row: {
          filename: string
          payload: Json
          study_id: string
          updated_at: string
        }
        Insert: {
          filename: string
          payload: Json
          study_id: string
          updated_at?: string
        }
        Update: {
          filename?: string
          payload?: Json
          study_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sources_v3_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: true
            referencedRelation: "studies_v3"
            referencedColumns: ["id"]
          },
        ]
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
      validacao_fechamento_aprovacoes: {
        Row: {
          approval_key: string
          approved_at: string
          approved_by_email: string
          building_id: string
          city: string
          divergence: string
          field: string
          period: string
          rule: string
          typology_id: string
        }
        Insert: {
          approval_key: string
          approved_at?: string
          approved_by_email: string
          building_id: string
          city: string
          divergence: string
          field: string
          period: string
          rule: string
          typology_id: string
        }
        Update: {
          approval_key?: string
          approved_at?: string
          approved_by_email?: string
          building_id?: string
          city?: string
          divergence?: string
          field?: string
          period?: string
          rule?: string
          typology_id?: string
        }
        Relationships: []
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
      empresas_estab_municipio_publicado: {
        Row: {
          cnae_secao: string | null
          competencia: string | null
          empresas_particao: string | null
          estabelecimentos_particao: string | null
          fonte: string | null
          id_municipio: string | null
          manifesto_id: string | null
          matriz_filial: number | null
          methodology_version: string | null
          porte: string | null
          quantidade: number | null
          query_version: string | null
          regime_simples: string | null
          simples_lido_em: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_estab_municipio_manifesto_id_fkey"
            columns: ["manifesto_id"]
            isOneToOne: false
            referencedRelation: "empresas_estab_manifesto"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_corretor_source_set: {
        Args: {
          p_files: string[]
          p_fingerprint: string
          p_name: string
          p_payload: Json
          p_study: string
          p_version: string
        }
        Returns: string
      }
      corretor_access_enabled: { Args: never; Returns: boolean }
      corretor_ai_usage: { Args: never; Returns: Json }
      corretor_claim_batch: {
        Args: {
          p_execution: string
          p_function: string
          p_hash: string
          p_owner: string
          p_reserve: number
        }
        Returns: Json
      }
      corretor_claim_batch_pre_review: {
        Args: {
          p_execution: string
          p_function: string
          p_hash: string
          p_owner: string
          p_reserve: number
        }
        Returns: Json
      }
      corretor_finish_batch: {
        Args: {
          p_cost: number
          p_execution: string
          p_hash: string
          p_response: Json
        }
        Returns: undefined
      }
      corretor_finish_batch_pre_review: {
        Args: {
          p_cost: number
          p_execution: string
          p_hash: string
          p_response: Json
        }
        Returns: undefined
      }
      corretor_prepare_study: {
        Args: {
          p_file: string
          p_findings: Json
          p_name: string
          p_sha1: string
          p_slides: number
        }
        Returns: Json
      }
      corretor_recommendation_profile_schema: { Args: never; Returns: number }
      corretor_recommendation_usage: {
        Args: { p_since?: string; p_until?: string }
        Returns: Json
      }
      corretor_review_profile_schema: { Args: never; Returns: number }
      corretor_trash_study: { Args: { p_study_id: string }; Returns: boolean }
      rais_claim_history_snapshot: {
        Args: {
          p_lease_seconds?: number
          p_methodology_version: string
          p_municipality_ibge: string
          p_municipality_name: string
          p_query_version: string
          p_source: string
          p_uf: string
        }
        Returns: {
          acquired: boolean
          retry_after_ms: number
          snapshot_id: string
          snapshot_status: string
        }[]
      }
      rais_claim_snapshot: {
        Args: {
          p_lease_seconds?: number
          p_methodology_version: string
          p_municipality_ibge: string
          p_municipality_name: string
          p_query_version: string
          p_source: string
          p_uf: string
          p_year: number
        }
        Returns: {
          acquired: boolean
          retry_after_ms: number
          snapshot_id: string
          snapshot_status: string
        }[]
      }
      rais_fail_history_snapshot: {
        Args: { p_error_code: string; p_snapshot_id: string }
        Returns: undefined
      }
      rais_fail_snapshot: {
        Args: { p_error_code: string; p_snapshot_id: string }
        Returns: undefined
      }
      rais_finish_history_snapshot: {
        Args: {
          p_bytes_processed: number
          p_first_year: number
          p_last_year: number
          p_point_count: number
          p_query_duration_ms: number
          p_snapshot_id: string
        }
        Returns: undefined
      }
      rais_finish_snapshot: {
        Args: {
          p_average_salary: number
          p_bytes_processed: number
          p_median_salary: number
          p_missing_cbo: number
          p_query_duration_ms: number
          p_salary_missing_or_zero: number
          p_snapshot_id: string
          p_total_employees: number
          p_total_links_in_year: number
        }
        Returns: undefined
      }
      register_corretor_original: {
        Args: {
          p_bytes: number
          p_name: string
          p_path: string
          p_project: string
          p_sha1: string
          p_sha256: string
          p_version: string
        }
        Returns: string
      }
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
    Enums: {},
  },
} as const
