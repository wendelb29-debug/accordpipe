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
      academy_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          scope_type: string
          sort_order: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          scope_type?: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scope_type?: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_courses: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_published: boolean
          level: string
          scope_type: string
          sort_order: number
          tenant_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_published?: boolean
          level?: string
          scope_type?: string
          sort_order?: number
          tenant_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_published?: boolean
          level?: string
          scope_type?: string
          sort_order?: number
          tenant_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "academy_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_lessons: {
        Row: {
          attachment_url: string | null
          content_html: string | null
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_preview: boolean
          is_published: boolean
          sort_order: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          attachment_url?: string | null
          content_html?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean
          is_published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          attachment_url?: string | null
          content_html?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean
          is_published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          last_watched_at: string | null
          lesson_id: string
          tenant_id: string
          updated_at: string
          user_id: string
          watch_percent: number
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          last_watched_at?: string | null
          lesson_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
          watch_percent?: number
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          last_watched_at?: string | null
          lesson_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          watch_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_reminders: {
        Row: {
          activity_id: string
          attempts: number
          created_at: string
          email_error: string | null
          email_sent_at: string | null
          id: string
          lead_id: string
          notify_email: boolean
          notify_system: boolean
          reminder_minutes: number
          reminder_scheduled_at: string
          servidor_id: string
          system_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          attempts?: number
          created_at?: string
          email_error?: string | null
          email_sent_at?: string | null
          id?: string
          lead_id: string
          notify_email?: boolean
          notify_system?: boolean
          reminder_minutes: number
          reminder_scheduled_at: string
          servidor_id: string
          system_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          attempts?: number
          created_at?: string
          email_error?: string | null
          email_sent_at?: string | null
          id?: string
          lead_id?: string
          notify_email?: boolean
          notify_system?: boolean
          reminder_minutes?: number
          reminder_scheduled_at?: string
          servidor_id?: string
          system_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_reminders_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "crm_lead_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_integrations: {
        Row: {
          ad_account_id: string | null
          business_id: string | null
          connected_by: string | null
          created_at: string
          google_webhook_key: string | null
          id: string
          page_access_token: string | null
          page_id: string | null
          provider: string
          servidor_id: string
          status: string
          system_user_token: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          business_id?: string | null
          connected_by?: string | null
          created_at?: string
          google_webhook_key?: string | null
          id?: string
          page_access_token?: string | null
          page_id?: string | null
          provider: string
          servidor_id: string
          status?: string
          system_user_token?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          business_id?: string | null
          connected_by?: string | null
          created_at?: string
          google_webhook_key?: string | null
          id?: string
          page_access_token?: string | null
          page_id?: string | null
          provider?: string
          servidor_id?: string
          status?: string
          system_user_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ad_lead_events: {
        Row: {
          created_at: string
          crm_lead_id: string | null
          error: string | null
          external_lead_id: string | null
          id: string
          processed: boolean | null
          provider: string | null
          raw_payload: Json | null
          servidor_id: string | null
        }
        Insert: {
          created_at?: string
          crm_lead_id?: string | null
          error?: string | null
          external_lead_id?: string | null
          id?: string
          processed?: boolean | null
          provider?: string | null
          raw_payload?: Json | null
          servidor_id?: string | null
        }
        Update: {
          created_at?: string
          crm_lead_id?: string | null
          error?: string | null
          external_lead_id?: string | null
          id?: string
          processed?: boolean | null
          provider?: string | null
          raw_payload?: Json | null
          servidor_id?: string | null
        }
        Relationships: []
      }
      ad_lead_forms: {
        Row: {
          campaign_id: string | null
          created_at: string
          external_form_id: string | null
          external_form_name: string | null
          field_mapping: Json | null
          google_webhook_key: string | null
          id: string
          is_active: boolean | null
          last_lead_at: string | null
          lead_count: number | null
          page_id: string | null
          provider: string
          servidor_id: string
          stage: string | null
          tags: string[] | null
          workspace_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          external_form_id?: string | null
          external_form_name?: string | null
          field_mapping?: Json | null
          google_webhook_key?: string | null
          id?: string
          is_active?: boolean | null
          last_lead_at?: string | null
          lead_count?: number | null
          page_id?: string | null
          provider: string
          servidor_id: string
          stage?: string | null
          tags?: string[] | null
          workspace_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          external_form_id?: string | null
          external_form_name?: string | null
          field_mapping?: Json | null
          google_webhook_key?: string | null
          id?: string
          is_active?: boolean | null
          last_lead_at?: string | null
          lead_count?: number | null
          page_id?: string | null
          provider?: string
          servidor_id?: string
          stage?: string | null
          tags?: string[] | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      analytics_export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_path: string | null
          file_url: string | null
          filters: Json
          id: string
          period_end: string | null
          period_start: string | null
          report_type: string
          requested_by: string
          row_count: number | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          file_url?: string | null
          filters?: Json
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type: string
          requested_by: string
          row_count?: number | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          file_url?: string | null
          filters?: Json
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type?: string
          requested_by?: string
          row_count?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          servidor_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          servidor_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          servidor_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log_changes: {
        Row: {
          audit_log_id: string
          change_type: string
          created_at: string
          field_label: string | null
          field_name: string
          id: string
          is_sensitive: boolean
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          audit_log_id: string
          change_type?: string
          created_at?: string
          field_label?: string | null
          field_name: string
          id?: string
          is_sensitive?: boolean
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          audit_log_id?: string
          change_type?: string
          created_at?: string
          field_label?: string | null
          field_name?: string
          id?: string
          is_sensitive?: boolean
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changes_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log_exports: {
        Row: {
          created_at: string
          exported_by: string
          file_path: string | null
          filters: Json
          format: string
          id: string
          row_count: number
          scope: string
          servidor_id: string | null
        }
        Insert: {
          created_at?: string
          exported_by: string
          file_path?: string | null
          filters?: Json
          format: string
          id?: string
          row_count?: number
          scope?: string
          servidor_id?: string | null
        }
        Update: {
          created_at?: string
          exported_by?: string
          file_path?: string | null
          filters?: Json
          format?: string
          id?: string
          row_count?: number
          scope?: string
          servidor_id?: string | null
        }
        Relationships: []
      }
      audit_log_reversions: {
        Row: {
          created_at: string
          id: string
          new_log_id: string
          original_log_id: string
          reverted_by: string
          servidor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_log_id: string
          original_log_id: string
          reverted_by: string
          servidor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_log_id?: string
          original_log_id?: string
          reverted_by?: string
          servidor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_reversions_new_log_id_fkey"
            columns: ["new_log_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_reversions_original_log_id_fkey"
            columns: ["original_log_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log_steps: {
        Row: {
          audit_log_id: string
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          started_at: string | null
          status: string
          step_name: string
          step_order: number
        }
        Insert: {
          audit_log_id: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          step_name: string
          step_order?: number
        }
        Update: {
          audit_log_id?: string
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          step_name?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_steps_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_type: string | null
          agent_id: string | null
          app_version: string | null
          automation_id: string | null
          browser: string | null
          channel_id: string | null
          completed_at: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          description: string | null
          details: Json | null
          device_type: string | null
          duration_ms: number | null
          entity_id: string | null
          entity_type: string | null
          environment: string | null
          error_code: string | null
          error_message: string | null
          event_type: string | null
          id: string
          integration_id: string | null
          ip_address: string | null
          ip_address_masked: string | null
          module: string | null
          request_id: string | null
          resource_id: string | null
          servidor_id: string | null
          severity: string | null
          source: string | null
          started_at: string | null
          status: string | null
          target_id: string | null
          target_type: string
          team_id: string | null
          title: string | null
          trace_id: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          actor_type?: string | null
          agent_id?: string | null
          app_version?: string | null
          automation_id?: string | null
          browser?: string | null
          channel_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          details?: Json | null
          device_type?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          environment?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          integration_id?: string | null
          ip_address?: string | null
          ip_address_masked?: string | null
          module?: string | null
          request_id?: string | null
          resource_id?: string | null
          servidor_id?: string | null
          severity?: string | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          target_id?: string | null
          target_type: string
          team_id?: string | null
          title?: string | null
          trace_id?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          actor_type?: string | null
          agent_id?: string | null
          app_version?: string | null
          automation_id?: string | null
          browser?: string | null
          channel_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          details?: Json | null
          device_type?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          environment?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          integration_id?: string | null
          ip_address?: string | null
          ip_address_masked?: string | null
          module?: string | null
          request_id?: string | null
          resource_id?: string | null
          servidor_id?: string | null
          severity?: string | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          target_id?: string | null
          target_type?: string
          team_id?: string | null
          title?: string | null
          trace_id?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      billing_plans: {
        Row: {
          base_user_limit: number
          created_at: string
          description: string | null
          extra_free_users_default: number
          id: string
          is_active: boolean
          is_custom: boolean
          monthly_price: number
          name: string
          price_per_extra_user: number
          slug: string
          sort_order: number
          updated_at: string
          yearly_price: number
        }
        Insert: {
          base_user_limit?: number
          created_at?: string
          description?: string | null
          extra_free_users_default?: number
          id?: string
          is_active?: boolean
          is_custom?: boolean
          monthly_price?: number
          name: string
          price_per_extra_user?: number
          slug: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          base_user_limit?: number
          created_at?: string
          description?: string | null
          extra_free_users_default?: number
          id?: string
          is_active?: boolean
          is_custom?: boolean
          monthly_price?: number
          name?: string
          price_per_extra_user?: number
          slug?: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      card_history: {
        Row: {
          from_column_id: string | null
          id: string
          lead_id: string
          moved_at: string
          moved_by_name: string | null
          moved_by_user_id: string | null
          to_column_id: string | null
          workspace_id: string
        }
        Insert: {
          from_column_id?: string | null
          id?: string
          lead_id: string
          moved_at?: string
          moved_by_name?: string | null
          moved_by_user_id?: string | null
          to_column_id?: string | null
          workspace_id: string
        }
        Update: {
          from_column_id?: string | null
          id?: string
          lead_id?: string
          moved_at?: string
          moved_by_name?: string | null
          moved_by_user_id?: string | null
          to_column_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_history_from_column_id_fkey"
            columns: ["from_column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_history_to_column_id_fkey"
            columns: ["to_column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_usage_logs: {
        Row: {
          certificate_id: string | null
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          purpose: string
          success: boolean
          target_id: string | null
          target_type: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          certificate_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          purpose: string
          success?: boolean
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          certificate_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          purpose?: string
          success?: boolean
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_usage_logs_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "tenant_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_agent_teams: {
        Row: {
          agent_id: string | null
          config: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_enabled: boolean
          position: number
          team_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_enabled?: boolean
          position?: number
          team_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_enabled?: boolean
          position?: number
          team_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_agent_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "chatbot_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_business_hours: {
        Row: {
          agent_id: string | null
          created_at: string
          created_by: string | null
          id: string
          off_hours_behavior: string
          tenant_id: string
          timezone: string
          updated_at: string
          updated_by: string | null
          weekly_schedule: Json
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          off_hours_behavior?: string
          tenant_id: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          weekly_schedule?: Json
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          off_hours_behavior?: string
          tenant_id?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          weekly_schedule?: Json
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_business_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_communication_settings: {
        Row: {
          agent_id: string | null
          audio_reply_enabled: boolean
          audio_transcribe_incoming: boolean
          audio_voice: string | null
          auto_reply_enabled: boolean
          created_at: string
          created_by: string | null
          document_analysis_enabled: boolean
          emoji_policy: string
          id: string
          image_analysis_enabled: boolean
          max_consecutive_replies: number
          max_data_retry_attempts: number
          max_emojis_per_message: number
          max_messages_before_handoff: number
          message_grouping_enabled: boolean
          message_grouping_window_seconds: number
          on_limit_reached: string
          pause_ai_on_human_reply: boolean
          reply_delay_seconds: number
          reply_existing_conversations: boolean
          reply_new_conversations: boolean
          resume_ai_after_minutes: number | null
          resume_ai_mode: string
          resume_ai_on_stage_id: string | null
          resume_ai_on_tag_id: string | null
          show_typing_indicator: boolean
          split_interval_ms: number
          split_long_messages: boolean
          split_max_blocks: number
          split_max_chars: number
          tenant_id: string
          transfer_default_priority: string
          transfer_enabled: boolean
          transfer_intent_phrases: Json
          typing_max_ms: number
          typing_min_ms: number
          typing_simulation: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_id?: string | null
          audio_reply_enabled?: boolean
          audio_transcribe_incoming?: boolean
          audio_voice?: string | null
          auto_reply_enabled?: boolean
          created_at?: string
          created_by?: string | null
          document_analysis_enabled?: boolean
          emoji_policy?: string
          id?: string
          image_analysis_enabled?: boolean
          max_consecutive_replies?: number
          max_data_retry_attempts?: number
          max_emojis_per_message?: number
          max_messages_before_handoff?: number
          message_grouping_enabled?: boolean
          message_grouping_window_seconds?: number
          on_limit_reached?: string
          pause_ai_on_human_reply?: boolean
          reply_delay_seconds?: number
          reply_existing_conversations?: boolean
          reply_new_conversations?: boolean
          resume_ai_after_minutes?: number | null
          resume_ai_mode?: string
          resume_ai_on_stage_id?: string | null
          resume_ai_on_tag_id?: string | null
          show_typing_indicator?: boolean
          split_interval_ms?: number
          split_long_messages?: boolean
          split_max_blocks?: number
          split_max_chars?: number
          tenant_id: string
          transfer_default_priority?: string
          transfer_enabled?: boolean
          transfer_intent_phrases?: Json
          typing_max_ms?: number
          typing_min_ms?: number
          typing_simulation?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_id?: string | null
          audio_reply_enabled?: boolean
          audio_transcribe_incoming?: boolean
          audio_voice?: string | null
          auto_reply_enabled?: boolean
          created_at?: string
          created_by?: string | null
          document_analysis_enabled?: boolean
          emoji_policy?: string
          id?: string
          image_analysis_enabled?: boolean
          max_consecutive_replies?: number
          max_data_retry_attempts?: number
          max_emojis_per_message?: number
          max_messages_before_handoff?: number
          message_grouping_enabled?: boolean
          message_grouping_window_seconds?: number
          on_limit_reached?: string
          pause_ai_on_human_reply?: boolean
          reply_delay_seconds?: number
          reply_existing_conversations?: boolean
          reply_new_conversations?: boolean
          resume_ai_after_minutes?: number | null
          resume_ai_mode?: string
          resume_ai_on_stage_id?: string | null
          resume_ai_on_tag_id?: string | null
          show_typing_indicator?: boolean
          split_interval_ms?: number
          split_long_messages?: boolean
          split_max_blocks?: number
          split_max_chars?: number
          tenant_id?: string
          transfer_default_priority?: string
          transfer_enabled?: boolean
          transfer_intent_phrases?: Json
          typing_max_ms?: number
          typing_min_ms?: number
          typing_simulation?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_communication_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_inactivity_rules: {
        Row: {
          agent_id: string | null
          auto_close_after_minutes: number
          auto_close_enabled: boolean
          close_final_status: string
          close_message: string
          close_tag: string | null
          create_followup_task: boolean
          create_summary: boolean
          created_at: string
          created_by: string | null
          first_warning_after_minutes: number
          first_warning_enabled: boolean
          first_warning_message: string
          id: string
          reopen_on_new_message: boolean
          second_warning_after_minutes: number
          second_warning_enabled: boolean
          second_warning_message: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_id?: string | null
          auto_close_after_minutes?: number
          auto_close_enabled?: boolean
          close_final_status?: string
          close_message?: string
          close_tag?: string | null
          create_followup_task?: boolean
          create_summary?: boolean
          created_at?: string
          created_by?: string | null
          first_warning_after_minutes?: number
          first_warning_enabled?: boolean
          first_warning_message?: string
          id?: string
          reopen_on_new_message?: boolean
          second_warning_after_minutes?: number
          second_warning_enabled?: boolean
          second_warning_message?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_id?: string | null
          auto_close_after_minutes?: number
          auto_close_enabled?: boolean
          close_final_status?: string
          close_message?: string
          close_tag?: string | null
          create_followup_task?: boolean
          create_summary?: boolean
          created_at?: string
          created_by?: string | null
          first_warning_after_minutes?: number
          first_warning_enabled?: boolean
          first_warning_message?: string
          id?: string
          reopen_on_new_message?: boolean
          second_warning_after_minutes?: number
          second_warning_enabled?: boolean
          second_warning_message?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_inactivity_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_message_templates: {
        Row: {
          agent_id: string | null
          channels: Json
          content: string
          created_at: string
          created_by: string | null
          enabled: boolean
          extra_config: Json
          id: string
          media_type: string | null
          media_url: string | null
          template_type: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_id?: string | null
          channels?: Json
          content?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          extra_config?: Json
          id?: string
          media_type?: string | null
          media_url?: string | null
          template_type: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_id?: string | null
          channels?: Json
          content?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          extra_config?: Json
          id?: string
          media_type?: string | null
          media_url?: string | null
          template_type?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_message_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_team_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          max_concurrent: number | null
          member_role: string
          member_status: string
          priority: number
          role: string
          team_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          max_concurrent?: number | null
          member_role?: string
          member_status?: string
          priority?: number
          role?: string
          team_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          max_concurrent?: number | null
          member_role?: string
          member_status?: string
          priority?: number
          role?: string
          team_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "chatbot_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_team_rules: {
        Row: {
          ai_description: string | null
          allowed_channels: string[]
          created_at: string
          fallback_team_id: string | null
          id: string
          intents: string[]
          keywords: string[]
          message_after: string | null
          message_before: string | null
          subjects: string[]
          tags: string[]
          team_id: string
          tenant_id: string
          transfer_mode: string
          unavailable_action: string
          updated_at: string
        }
        Insert: {
          ai_description?: string | null
          allowed_channels?: string[]
          created_at?: string
          fallback_team_id?: string | null
          id?: string
          intents?: string[]
          keywords?: string[]
          message_after?: string | null
          message_before?: string | null
          subjects?: string[]
          tags?: string[]
          team_id: string
          tenant_id: string
          transfer_mode?: string
          unavailable_action?: string
          updated_at?: string
        }
        Update: {
          ai_description?: string | null
          allowed_channels?: string[]
          created_at?: string
          fallback_team_id?: string | null
          id?: string
          intents?: string[]
          keywords?: string[]
          message_after?: string | null
          message_before?: string | null
          subjects?: string[]
          tags?: string[]
          team_id?: string
          tenant_id?: string
          transfer_mode?: string
          unavailable_action?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_team_rules_fallback_team_id_fkey"
            columns: ["fallback_team_id"]
            isOneToOne: false
            referencedRelation: "chatbot_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_team_rules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "chatbot_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_team_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_teams: {
        Row: {
          archived_at: string | null
          attend_holidays: boolean
          channels: string[]
          color: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department_id: string | null
          description: string | null
          distribution_method: string
          fallback_action: string
          fallback_team_id: string | null
          icon: string
          id: string
          max_concurrent_conversations: number | null
          max_concurrent_per_agent: number
          max_wait_seconds: number
          name: string
          offhours_message: string | null
          priority: number
          queue_timeout_minutes: number | null
          schedule: Json
          schedule_mode: string
          status: string
          team_type: string
          tenant_id: string
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          attend_holidays?: boolean
          channels?: string[]
          color?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string | null
          description?: string | null
          distribution_method?: string
          fallback_action?: string
          fallback_team_id?: string | null
          icon?: string
          id?: string
          max_concurrent_conversations?: number | null
          max_concurrent_per_agent?: number
          max_wait_seconds?: number
          name: string
          offhours_message?: string | null
          priority?: number
          queue_timeout_minutes?: number | null
          schedule?: Json
          schedule_mode?: string
          status?: string
          team_type?: string
          tenant_id: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          attend_holidays?: boolean
          channels?: string[]
          color?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string | null
          description?: string | null
          distribution_method?: string
          fallback_action?: string
          fallback_team_id?: string | null
          icon?: string
          id?: string
          max_concurrent_conversations?: number | null
          max_concurrent_per_agent?: number
          max_wait_seconds?: number
          name?: string
          offhours_message?: string | null
          priority?: number
          queue_timeout_minutes?: number | null
          schedule?: Json
          schedule_mode?: string
          status?: string
          team_type?: string
          tenant_id?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "tenant_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_teams_fallback_team_id_fkey"
            columns: ["fallback_team_id"]
            isOneToOne: false
            referencedRelation: "chatbot_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contract_history: {
        Row: {
          action: string
          contract_id: string
          created_at: string
          created_by_name: string | null
          description: string | null
          id: string
        }
        Insert: {
          action: string
          contract_id: string
          created_at?: string
          created_by_name?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          action?: string
          contract_id?: string
          created_at?: string
          created_by_name?: string | null
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "client_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contract_signers: {
        Row: {
          contract_id: string
          created_at: string
          email: string | null
          id: string
          is_required: boolean
          name: string
          sign_order: number
          signature_address: string | null
          signature_latitude: number | null
          signature_longitude: number | null
          signature_photo_url: string | null
          signed_at: string | null
          signer_document: string | null
          signer_ip: string | null
          signer_type: string
          signing_token: string
          status: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_required?: boolean
          name: string
          sign_order?: number
          signature_address?: string | null
          signature_latitude?: number | null
          signature_longitude?: number | null
          signature_photo_url?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_type?: string
          signing_token?: string
          status?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_required?: boolean
          name?: string
          sign_order?: number
          signature_address?: string | null
          signature_latitude?: number | null
          signature_longitude?: number | null
          signature_photo_url?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_type?: string
          signing_token?: string
          status?: string
        }
        Relationships: []
      }
      client_contracts: {
        Row: {
          client_cpf: string | null
          client_name: string
          contract_content: string | null
          contract_status: string
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          document_hash: string | null
          id: string
          lead_id: string | null
          monthly_value: number | null
          plan_name: string | null
          registration_id: string
          servidor_id: string
          signature_address: string | null
          signature_latitude: number | null
          signature_longitude: number | null
          signature_photo_url: string | null
          signed_at: string | null
          signer_document: string | null
          signer_name: string | null
          signing_token: string | null
          updated_at: string
          validation_code: string | null
        }
        Insert: {
          client_cpf?: string | null
          client_name: string
          contract_content?: string | null
          contract_status?: string
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          document_hash?: string | null
          id?: string
          lead_id?: string | null
          monthly_value?: number | null
          plan_name?: string | null
          registration_id: string
          servidor_id: string
          signature_address?: string | null
          signature_latitude?: number | null
          signature_longitude?: number | null
          signature_photo_url?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_name?: string | null
          signing_token?: string | null
          updated_at?: string
          validation_code?: string | null
        }
        Update: {
          client_cpf?: string | null
          client_name?: string
          contract_content?: string | null
          contract_status?: string
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          document_hash?: string | null
          id?: string
          lead_id?: string | null
          monthly_value?: number | null
          plan_name?: string | null
          registration_id?: string
          servidor_id?: string
          signature_address?: string | null
          signature_latitude?: number | null
          signature_longitude?: number | null
          signature_photo_url?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_name?: string | null
          signing_token?: string | null
          updated_at?: string
          validation_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "crm_client_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_upsells: {
        Row: {
          amount: number
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          description: string | null
          id: string
          lead_id: string | null
          name: string
          registration_id: string
          servidor_id: string
          start_date: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          name: string
          registration_id: string
          servidor_id: string
          start_date?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          registration_id?: string
          servidor_id?: string
          start_date?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_upsells_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_upsells_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "crm_client_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_upsells_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_drive_accounts: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          oauth_scopes: string | null
          oauth_tokens: Json | null
          provider: string
          provider_user_id: string | null
          quota_synced_at: string | null
          quota_total: number | null
          quota_used: number | null
          servidor_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          oauth_scopes?: string | null
          oauth_tokens?: Json | null
          provider: string
          provider_user_id?: string | null
          quota_synced_at?: string | null
          quota_total?: number | null
          quota_used?: number | null
          servidor_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          oauth_scopes?: string | null
          oauth_tokens?: Json | null
          provider?: string
          provider_user_id?: string | null
          quota_synced_at?: string | null
          quota_total?: number | null
          quota_used?: number | null
          servidor_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collab_conversations: {
        Row: {
          avatar_url: string | null
          color: string | null
          created_at: string
          created_by: string
          emoji: string | null
          id: string
          invite_token: string
          is_pinned: boolean
          kind: string
          last_message_at: string | null
          last_message_preview: string | null
          name: string
          servidor_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          emoji?: string | null
          id?: string
          invite_token?: string
          is_pinned?: boolean
          kind?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          name: string
          servidor_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          emoji?: string | null
          id?: string
          invite_token?: string
          is_pinned?: boolean
          kind?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          name?: string
          servidor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      collab_members: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "collab_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_message_favorites: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message_id: string
          servidor_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message_id: string
          servidor_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message_id?: string
          servidor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_message_favorites_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "collab_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_messages: {
        Row: {
          attachments: Json
          content: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_pinned: boolean
          is_system: boolean
          reply_to_id: string | null
          sender_id: string | null
          servidor_id: string
        }
        Insert: {
          attachments?: Json
          content?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          is_system?: boolean
          reply_to_id?: string | null
          sender_id?: string | null
          servidor_id: string
        }
        Update: {
          attachments?: Json
          content?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          is_system?: boolean
          reply_to_id?: string | null
          sender_id?: string | null
          servidor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "collab_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "collab_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          servidor_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          servidor_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          servidor_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "collab_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_polls: {
        Row: {
          anonymous: boolean
          closed: boolean
          closed_at: string | null
          closes_at: string | null
          conversation_id: string
          created_at: string
          created_by: string
          deadline: string | null
          id: string
          message_id: string | null
          multi: boolean
          options: Json
          question: string
          servidor_id: string
          show_voters: boolean
        }
        Insert: {
          anonymous?: boolean
          closed?: boolean
          closed_at?: string | null
          closes_at?: string | null
          conversation_id: string
          created_at?: string
          created_by: string
          deadline?: string | null
          id?: string
          message_id?: string | null
          multi?: boolean
          options: Json
          question: string
          servidor_id: string
          show_voters?: boolean
        }
        Update: {
          anonymous?: boolean
          closed?: boolean
          closed_at?: string | null
          closes_at?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string
          deadline?: string | null
          id?: string
          message_id?: string | null
          multi?: boolean
          options?: Json
          question?: string
          servidor_id?: string
          show_voters?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "collab_polls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "collab_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "collab_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "collab_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          bairro: string | null
          brand_accent_color: string | null
          brand_bg_color: string | null
          brand_logo_path: string | null
          brand_logo_url: string | null
          brand_primary_color: string | null
          brand_secondary_color: string | null
          brand_text_color: string | null
          can_create_child_tenants: boolean
          can_create_tenants: boolean
          can_create_test_tenants: boolean
          can_edit_child_tenants: boolean
          can_manage_child_tenants: boolean
          can_reactivate_child_tenants: boolean
          can_suspend_child_tenants: boolean
          can_view_child_billing: boolean
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          created_at: string
          created_by: string | null
          created_by_tenant_id: string | null
          doc_accent_color: string | null
          doc_bg_color: string | null
          doc_primary_color: string | null
          doc_secondary_color: string | null
          doc_text_color: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          is_reseller: boolean
          is_trial: boolean
          max_child_tenants: number | null
          nome_fantasia: string | null
          numero: string | null
          parent_tenant_id: string | null
          razao_social: string
          reseller_panel_enabled: boolean
          responsavel: string | null
          servidor_id: string | null
          status: string
          telefone: string | null
          tenant_type: string
          trial_expires_at: string | null
          trial_extensions: number
          trial_start: string | null
          updated_at: string
          webhook_token: string
          zapi_client_token: string | null
          zapi_instance_id: string | null
          zapi_phone: string | null
          zapi_token: string | null
          zapi_webhook_chat_presence: string | null
          zapi_webhook_message_status: string | null
          zapi_webhook_notify_me: boolean | null
          zapi_webhook_on_connect: string | null
          zapi_webhook_on_disconnect: string | null
          zapi_webhook_on_receive: string | null
          zapi_webhook_on_send: string | null
        }
        Insert: {
          bairro?: string | null
          brand_accent_color?: string | null
          brand_bg_color?: string | null
          brand_logo_path?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          brand_text_color?: string | null
          can_create_child_tenants?: boolean
          can_create_tenants?: boolean
          can_create_test_tenants?: boolean
          can_edit_child_tenants?: boolean
          can_manage_child_tenants?: boolean
          can_reactivate_child_tenants?: boolean
          can_suspend_child_tenants?: boolean
          can_view_child_billing?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          created_by_tenant_id?: string | null
          doc_accent_color?: string | null
          doc_bg_color?: string | null
          doc_primary_color?: string | null
          doc_secondary_color?: string | null
          doc_text_color?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_reseller?: boolean
          is_trial?: boolean
          max_child_tenants?: number | null
          nome_fantasia?: string | null
          numero?: string | null
          parent_tenant_id?: string | null
          razao_social: string
          reseller_panel_enabled?: boolean
          responsavel?: string | null
          servidor_id?: string | null
          status?: string
          telefone?: string | null
          tenant_type?: string
          trial_expires_at?: string | null
          trial_extensions?: number
          trial_start?: string | null
          updated_at?: string
          webhook_token?: string
          zapi_client_token?: string | null
          zapi_instance_id?: string | null
          zapi_phone?: string | null
          zapi_token?: string | null
          zapi_webhook_chat_presence?: string | null
          zapi_webhook_message_status?: string | null
          zapi_webhook_notify_me?: boolean | null
          zapi_webhook_on_connect?: string | null
          zapi_webhook_on_disconnect?: string | null
          zapi_webhook_on_receive?: string | null
          zapi_webhook_on_send?: string | null
        }
        Update: {
          bairro?: string | null
          brand_accent_color?: string | null
          brand_bg_color?: string | null
          brand_logo_path?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          brand_text_color?: string | null
          can_create_child_tenants?: boolean
          can_create_tenants?: boolean
          can_create_test_tenants?: boolean
          can_edit_child_tenants?: boolean
          can_manage_child_tenants?: boolean
          can_reactivate_child_tenants?: boolean
          can_suspend_child_tenants?: boolean
          can_view_child_billing?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          created_by_tenant_id?: string | null
          doc_accent_color?: string | null
          doc_bg_color?: string | null
          doc_primary_color?: string | null
          doc_secondary_color?: string | null
          doc_text_color?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_reseller?: boolean
          is_trial?: boolean
          max_child_tenants?: number | null
          nome_fantasia?: string | null
          numero?: string | null
          parent_tenant_id?: string | null
          razao_social?: string
          reseller_panel_enabled?: boolean
          responsavel?: string | null
          servidor_id?: string | null
          status?: string
          telefone?: string | null
          tenant_type?: string
          trial_expires_at?: string | null
          trial_extensions?: number
          trial_start?: string | null
          updated_at?: string
          webhook_token?: string
          zapi_client_token?: string | null
          zapi_instance_id?: string | null
          zapi_phone?: string | null
          zapi_token?: string | null
          zapi_webhook_chat_presence?: string | null
          zapi_webhook_message_status?: string | null
          zapi_webhook_notify_me?: boolean | null
          zapi_webhook_on_connect?: string | null
          zapi_webhook_on_disconnect?: string | null
          zapi_webhook_on_receive?: string | null
          zapi_webhook_on_send?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_tenant_id_fkey"
            columns: ["created_by_tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_api_credentials: {
        Row: {
          company_id: string
          created_at: string
          id: string
          updated_at: string
          zapi_client_token: string | null
          zapi_instance_id: string | null
          zapi_token: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
          zapi_client_token?: string | null
          zapi_instance_id?: string | null
          zapi_token?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          zapi_client_token?: string | null
          zapi_instance_id?: string | null
          zapi_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_api_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contract_template_fields: {
        Row: {
          created_at: string
          field_type: string
          height: number
          id: string
          label: string | null
          page: number
          pos_x: number
          pos_y: number
          required: boolean
          template_id: string
          width: number
        }
        Insert: {
          created_at?: string
          field_type?: string
          height?: number
          id?: string
          label?: string | null
          page?: number
          pos_x?: number
          pos_y?: number
          required?: boolean
          template_id: string
          width?: number
        }
        Update: {
          created_at?: string
          field_type?: string
          height?: number
          id?: string
          label?: string | null
          page?: number
          pos_x?: number
          pos_y?: number
          required?: boolean
          template_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_contract_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "company_contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contract_templates: {
        Row: {
          company_id: string
          contract_content: string | null
          created_at: string
          id: string
          name: string
          pdf_path: string
          pdf_url: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contract_content?: string | null
          created_at?: string
          id?: string
          name?: string
          pdf_path: string
          pdf_url: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contract_content?: string | null
          created_at?: string
          id?: string
          name?: string
          pdf_path?: string
          pdf_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_contract_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_assignment_status: {
        Row: {
          assigned_by_system: boolean
          assigned_to_user_id: string | null
          assumed_at: string | null
          closed_at: string | null
          contact_id: string
          created_at: string
          department_id: string | null
          id: string
          queue_position: number | null
          status: string
          tenant_id: string
          timeout_auto_release_at: string | null
        }
        Insert: {
          assigned_by_system?: boolean
          assigned_to_user_id?: string | null
          assumed_at?: string | null
          closed_at?: string | null
          contact_id: string
          created_at?: string
          department_id?: string | null
          id?: string
          queue_position?: number | null
          status?: string
          tenant_id: string
          timeout_auto_release_at?: string | null
        }
        Update: {
          assigned_by_system?: boolean
          assigned_to_user_id?: string | null
          assumed_at?: string | null
          closed_at?: string | null
          contact_id?: string
          created_at?: string
          department_id?: string | null
          id?: string
          queue_position?: number | null
          status?: string
          tenant_id?: string
          timeout_auto_release_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_assignment_status_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_assignment_status_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "tenant_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_assignment_status_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          signature_address: string | null
          signature_latitude: number | null
          signature_longitude: number | null
          signature_photo_url: string | null
          signed_at: string | null
          signer_document: string | null
          signer_ip: string | null
          signer_name: string | null
          signer_role: string
          signing_token: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          signature_address?: string | null
          signature_latitude?: number | null
          signature_longitude?: number | null
          signature_photo_url?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          signer_role?: string
          signing_token?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          signature_address?: string | null
          signature_latitude?: number | null
          signature_longitude?: number | null
          signature_photo_url?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          signer_role?: string
          signing_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          code: string
          company_id: string
          contract_content: string | null
          contract_type: string
          created_at: string
          created_by: string | null
          document_hash: string | null
          foro: string | null
          id: string
          lead_id: string | null
          link_expires_at: string | null
          matriz_cnpj: string | null
          matriz_endereco: string | null
          matriz_nome: string | null
          pdf_assinado_path: string | null
          pdf_assinado_url: string | null
          pdf_url: string | null
          signature_address: string | null
          signature_latitude: number | null
          signature_link: string | null
          signature_longitude: number | null
          signature_photo_url: string | null
          signature_status: string
          signature_type: string | null
          signed_at: string | null
          signer_document: string | null
          signer_name: string | null
          signing_token: string | null
          updated_at: string
          validation_code: string | null
        }
        Insert: {
          code: string
          company_id: string
          contract_content?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          document_hash?: string | null
          foro?: string | null
          id?: string
          lead_id?: string | null
          link_expires_at?: string | null
          matriz_cnpj?: string | null
          matriz_endereco?: string | null
          matriz_nome?: string | null
          pdf_assinado_path?: string | null
          pdf_assinado_url?: string | null
          pdf_url?: string | null
          signature_address?: string | null
          signature_latitude?: number | null
          signature_link?: string | null
          signature_longitude?: number | null
          signature_photo_url?: string | null
          signature_status?: string
          signature_type?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_name?: string | null
          signing_token?: string | null
          updated_at?: string
          validation_code?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          contract_content?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          document_hash?: string | null
          foro?: string | null
          id?: string
          lead_id?: string | null
          link_expires_at?: string | null
          matriz_cnpj?: string | null
          matriz_endereco?: string | null
          matriz_nome?: string | null
          pdf_assinado_path?: string | null
          pdf_assinado_url?: string | null
          pdf_url?: string | null
          signature_address?: string | null
          signature_latitude?: number | null
          signature_link?: string | null
          signature_longitude?: number | null
          signature_photo_url?: string | null
          signature_status?: string
          signature_type?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_name?: string | null
          signing_token?: string | null
          updated_at?: string
          validation_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_client_dependents: {
        Row: {
          created_at: string
          data_nascimento: string | null
          grau_parentesco: string | null
          id: string
          nome_completo: string
          registration_id: string
        }
        Insert: {
          created_at?: string
          data_nascimento?: string | null
          grau_parentesco?: string | null
          id?: string
          nome_completo: string
          registration_id: string
        }
        Update: {
          created_at?: string
          data_nascimento?: string | null
          grau_parentesco?: string | null
          id?: string
          nome_completo?: string
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_client_dependents_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "crm_client_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_client_registrations: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          client_status: string
          comprovante_url: string | null
          cpf: string | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          data_adesao: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          lead_id: string
          nome_completo: string | null
          nome_mae: string | null
          nome_pai: string | null
          numero: string | null
          plano_contratado: string | null
          rg: string | null
          servidor_id: string
          status: string
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          client_status?: string
          comprovante_url?: string | null
          cpf?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          data_adesao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          lead_id: string
          nome_completo?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          plano_contratado?: string | null
          rg?: string | null
          servidor_id: string
          status?: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          client_status?: string
          comprovante_url?: string | null
          cpf?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          data_adesao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          lead_id?: string
          nome_completo?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          plano_contratado?: string | null
          rg?: string | null
          servidor_id?: string
          status?: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_client_registrations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_client_registrations_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_forms: {
        Row: {
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          cta_text: string | null
          description: string | null
          fields: Json
          headline: string | null
          id: string
          is_active: boolean
          landing_page_enabled: boolean
          name: string
          redirect_url_after_submit: string | null
          seo_description: string | null
          seo_title: string | null
          servidor_id: string
          slug: string | null
          subheadline: string | null
          tags: string[] | null
          thank_you_message: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          cta_text?: string | null
          description?: string | null
          fields?: Json
          headline?: string | null
          id?: string
          is_active?: boolean
          landing_page_enabled?: boolean
          name: string
          redirect_url_after_submit?: string | null
          seo_description?: string | null
          seo_title?: string | null
          servidor_id: string
          slug?: string | null
          subheadline?: string | null
          tags?: string[] | null
          thank_you_message?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          cta_text?: string | null
          description?: string | null
          fields?: Json
          headline?: string | null
          id?: string
          is_active?: boolean
          landing_page_enabled?: boolean
          name?: string
          redirect_url_after_submit?: string | null
          seo_description?: string | null
          seo_title?: string | null
          servidor_id?: string
          slug?: string | null
          subheadline?: string | null
          tags?: string[] | null
          thank_you_message?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_forms_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_forms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_activities: {
        Row: {
          completed_at: string | null
          completed_by_name: string | null
          completed_by_user_id: string | null
          completion_note: string | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          no_show_at: string | null
          no_show_by_name: string | null
          no_show_by_user_id: string | null
          no_show_note: string | null
          servidor_id: string
          status: string
          title: string
          type: string
        }
        Insert: {
          completed_at?: string | null
          completed_by_name?: string | null
          completed_by_user_id?: string | null
          completion_note?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          no_show_at?: string | null
          no_show_by_name?: string | null
          no_show_by_user_id?: string | null
          no_show_note?: string | null
          servidor_id: string
          status?: string
          title: string
          type?: string
        }
        Update: {
          completed_at?: string | null
          completed_by_name?: string | null
          completed_by_user_id?: string | null
          completion_note?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          no_show_at?: string | null
          no_show_by_name?: string | null
          no_show_by_user_id?: string | null
          no_show_note?: string | null
          servidor_id?: string
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_activities_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          company_id: string | null
          company_name: string
          complemento: string | null
          contact_name: string | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          documento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          forecast_date: string | null
          form_id: string | null
          id: string
          is_request: boolean
          lead_status: string
          lost_reason: string | null
          notes: string | null
          numero: string | null
          origin_stage: string | null
          origin_workspace_id: string | null
          phone: string | null
          request_notes: string | null
          request_title: string | null
          servidor_id: string
          source: string
          stage: string
          stage_entered_at: string
          status_changed_at: string | null
          tags: string[] | null
          trash_reason: string | null
          updated_at: string
          value_mrr: number
          value_ps: number
          workspace_id: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          company_name: string
          complemento?: string | null
          contact_name?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          forecast_date?: string | null
          form_id?: string | null
          id?: string
          is_request?: boolean
          lead_status?: string
          lost_reason?: string | null
          notes?: string | null
          numero?: string | null
          origin_stage?: string | null
          origin_workspace_id?: string | null
          phone?: string | null
          request_notes?: string | null
          request_title?: string | null
          servidor_id: string
          source?: string
          stage?: string
          stage_entered_at?: string
          status_changed_at?: string | null
          tags?: string[] | null
          trash_reason?: string | null
          updated_at?: string
          value_mrr?: number
          value_ps?: number
          workspace_id?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          company_name?: string
          complemento?: string | null
          contact_name?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          forecast_date?: string | null
          form_id?: string | null
          id?: string
          is_request?: boolean
          lead_status?: string
          lost_reason?: string | null
          notes?: string | null
          numero?: string | null
          origin_stage?: string | null
          origin_workspace_id?: string | null
          phone?: string | null
          request_notes?: string | null
          request_title?: string | null
          servidor_id?: string
          source?: string
          stage?: string
          stage_entered_at?: string
          status_changed_at?: string | null
          tags?: string[] | null
          trash_reason?: string | null
          updated_at?: string
          value_mrr?: number
          value_ps?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "crm_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          servidor_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          servidor_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          servidor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tags_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      department_routing_config: {
        Row: {
          created_at: string
          first_response_message: string
          id: string
          is_enabled: boolean
          tenant_id: string
          timeout_minutes: number
          updated_at: string
          welcome_message: string
        }
        Insert: {
          created_at?: string
          first_response_message?: string
          id?: string
          is_enabled?: boolean
          tenant_id: string
          timeout_minutes?: number
          updated_at?: string
          welcome_message?: string
        }
        Update: {
          created_at?: string
          first_response_message?: string
          id?: string
          is_enabled?: boolean
          tenant_id?: string
          timeout_minutes?: number
          updated_at?: string
          welcome_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_routing_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      department_routing_log: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          reason: string | null
          routed_to_user_id: string | null
          routing_method: string | null
          selected_department_id: string | null
          selected_option: string | null
          tenant_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          reason?: string | null
          routed_to_user_id?: string | null
          routing_method?: string | null
          selected_department_id?: string | null
          selected_option?: string | null
          tenant_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          routed_to_user_id?: string | null
          routing_method?: string | null
          selected_department_id?: string | null
          selected_option?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_routing_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_routing_log_selected_department_id_fkey"
            columns: ["selected_department_id"]
            isOneToOne: false
            referencedRelation: "tenant_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_routing_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_events: {
        Row: {
          created_at: string
          descricao: string | null
          document_id: string
          evento: string
          id: string
          metadata_json: Json | null
          signer_id: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          document_id: string
          evento: string
          id?: string
          metadata_json?: Json | null
          signer_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          document_id?: string
          evento?: string
          id?: string
          metadata_json?: Json | null
          signer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_events_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "document_signers"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signers: {
        Row: {
          auth_token: string
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          document_id: string
          email: string | null
          id: string
          ip_address: string | null
          location_lat: number | null
          location_lng: number | null
          location_text: string | null
          nome_completo: string
          obrigatorio: boolean
          ordem: number
          papel: string
          reject_reason: string | null
          rejected_at: string | null
          selfie_url: string | null
          signed_at: string | null
          status: string
          telefone: string | null
          updated_at: string
          user_agent: string | null
          validated_at: string | null
          validation_code: string | null
          validation_code_expires_at: string | null
          viewed_at: string | null
        }
        Insert: {
          auth_token?: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          document_id: string
          email?: string | null
          id?: string
          ip_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
          nome_completo: string
          obrigatorio?: boolean
          ordem?: number
          papel?: string
          reject_reason?: string | null
          rejected_at?: string | null
          selfie_url?: string | null
          signed_at?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_agent?: string | null
          validated_at?: string | null
          validation_code?: string | null
          validation_code_expires_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          auth_token?: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          document_id?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
          nome_completo?: string
          obrigatorio?: boolean
          ordem?: number
          papel?: string
          reject_reason?: string | null
          rejected_at?: string | null
          selfie_url?: string | null
          signed_at?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_agent?: string | null
          validated_at?: string | null
          validation_code?: string | null
          validation_code_expires_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          arquivo_nome: string | null
          arquivo_path: string | null
          arquivo_url: string | null
          ativo: boolean
          content_template: string | null
          created_at: string
          id: string
          is_default: boolean | null
          nome: string
          placeholders_json: Json | null
          servidor_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          arquivo_url?: string | null
          ativo?: boolean
          content_template?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          nome: string
          placeholders_json?: Json | null
          servidor_id: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          arquivo_url?: string | null
          ativo?: boolean
          content_template?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          nome?: string
          placeholders_json?: Json | null
          servidor_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          company_id: string | null
          created_at: string
          file_path: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          company_id?: string | null
          created_at?: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          company_id?: string | null
          created_at?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_files: {
        Row: {
          contract_id: string | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          name: string
          parent_id: string | null
          servidor_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name: string
          parent_id?: string | null
          servidor_id: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          servidor_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_files_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pdf_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_files_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          calendar_integration: boolean
          created_at: string
          crm_integration: boolean
          daily_limit: number | null
          display_name: string
          email_address: string
          id: string
          imap_config: Json | null
          import_since: string
          last_history_id: string | null
          last_synced_at: string | null
          oauth_provider_user_id: string | null
          oauth_scopes: string | null
          oauth_tokens: Json | null
          provider: string
          sender_name: string | null
          servidor_id: string
          shared_sender: boolean
          status: string
          status_message: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_integration?: boolean
          created_at?: string
          crm_integration?: boolean
          daily_limit?: number | null
          display_name: string
          email_address: string
          id?: string
          imap_config?: Json | null
          import_since?: string
          last_history_id?: string | null
          last_synced_at?: string | null
          oauth_provider_user_id?: string | null
          oauth_scopes?: string | null
          oauth_tokens?: Json | null
          provider: string
          sender_name?: string | null
          servidor_id: string
          shared_sender?: boolean
          status?: string
          status_message?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_integration?: boolean
          created_at?: string
          crm_integration?: boolean
          daily_limit?: number | null
          display_name?: string
          email_address?: string
          id?: string
          imap_config?: Json | null
          import_since?: string
          last_history_id?: string | null
          last_synced_at?: string | null
          oauth_provider_user_id?: string | null
          oauth_scopes?: string | null
          oauth_tokens?: Json | null
          provider?: string
          sender_name?: string | null
          servidor_id?: string
          shared_sender?: boolean
          status?: string
          status_message?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          account_id: string
          attachments: Json | null
          bcc_emails: Json | null
          body_html: string | null
          body_text: string | null
          cc_emails: Json | null
          created_at: string
          folder: string
          from_email: string | null
          from_name: string | null
          has_attachments: boolean
          id: string
          is_important: boolean
          is_read: boolean
          is_starred: boolean
          labels: Json | null
          provider_msg_id: string
          raw_eml_path: string | null
          raw_headers: Json | null
          received_at: string | null
          servidor_id: string
          snippet: string | null
          snoozed_until: string | null
          subject: string | null
          thread_id: string | null
          to_emails: Json | null
        }
        Insert: {
          account_id: string
          attachments?: Json | null
          bcc_emails?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_emails?: Json | null
          created_at?: string
          folder?: string
          from_email?: string | null
          from_name?: string | null
          has_attachments?: boolean
          id?: string
          is_important?: boolean
          is_read?: boolean
          is_starred?: boolean
          labels?: Json | null
          provider_msg_id: string
          raw_eml_path?: string | null
          raw_headers?: Json | null
          received_at?: string | null
          servidor_id: string
          snippet?: string | null
          snoozed_until?: string | null
          subject?: string | null
          thread_id?: string | null
          to_emails?: Json | null
        }
        Update: {
          account_id?: string
          attachments?: Json | null
          bcc_emails?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_emails?: Json | null
          created_at?: string
          folder?: string
          from_email?: string | null
          from_name?: string | null
          has_attachments?: boolean
          id?: string
          is_important?: boolean
          is_read?: boolean
          is_starred?: boolean
          labels?: Json | null
          provider_msg_id?: string
          raw_eml_path?: string | null
          raw_headers?: Json | null
          received_at?: string | null
          servidor_id?: string
          snippet?: string | null
          snoozed_until?: string | null
          subject?: string | null
          thread_id?: string | null
          to_emails?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_suppression_list: {
        Row: {
          created_at: string
          email: string
          external_message_id: string | null
          id: string
          metadata: Json
          reason: string
          source: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          external_message_id?: string | null
          id?: string
          metadata?: Json
          reason: string
          source?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          external_message_id?: string | null
          id?: string
          metadata?: Json
          reason?: string
          source?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean
          is_shared: boolean
          last_used_at: string | null
          name: string
          preview_text: string | null
          servidor_id: string
          subject: string
          updated_at: string
          used_count: number
          user_id: string
          variables: string[]
        }
        Insert: {
          body_html: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          is_shared?: boolean
          last_used_at?: string | null
          name: string
          preview_text?: string | null
          servidor_id: string
          subject: string
          updated_at?: string
          used_count?: number
          user_id: string
          variables?: string[]
        }
        Update: {
          body_html?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean
          is_shared?: boolean
          last_used_at?: string | null
          name?: string
          preview_text?: string | null
          servidor_id?: string
          subject?: string
          updated_at?: string
          used_count?: number
          user_id?: string
          variables?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feed_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          emoji: string
          id: string
          servidor_id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          emoji?: string
          id?: string
          servidor_id: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
          servidor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "feed_post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_poll_options: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          position: number
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          position?: number
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          position?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "feed_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "feed_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "feed_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_polls: {
        Row: {
          allow_multiple: boolean
          created_at: string
          id: string
          post_id: string
          question: string
          servidor_id: string
        }
        Insert: {
          allow_multiple?: boolean
          created_at?: string
          id?: string
          post_id: string
          question: string
          servidor_id: string
        }
        Update: {
          allow_multiple?: boolean
          created_at?: string
          id?: string
          post_id?: string
          question?: string
          servidor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          mention_all: boolean
          mentions: string[]
          parent_id: string | null
          post_id: string
          servidor_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mention_all?: boolean
          mentions?: string[]
          parent_id?: string | null
          post_id: string
          servidor_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mention_all?: boolean
          mentions?: string[]
          parent_id?: string | null
          post_id?: string
          servidor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "feed_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_follows: {
        Row: {
          created_at: string
          id: string
          post_id: string
          servidor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          servidor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          servidor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_follows_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          servidor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          post_id: string
          servidor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          servidor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_saves: {
        Row: {
          created_at: string
          post_id: string
          servidor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          servidor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          servidor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_views: {
        Row: {
          id: string
          post_id: string
          servidor_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          post_id: string
          servidor_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          servidor_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          appreciation_kind: string | null
          appreciation_to: string | null
          author_id: string
          content: string
          created_at: string
          expires_at: string | null
          id: string
          image_url: string | null
          pinned: boolean
          post_type: string
          recipients: string
          servidor_id: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          appreciation_kind?: string | null
          appreciation_to?: string | null
          author_id: string
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          pinned?: boolean
          post_type?: string
          recipients?: string
          servidor_id: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          appreciation_kind?: string | null
          appreciation_to?: string | null
          author_id?: string
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          pinned?: boolean
          post_type?: string
          recipients?: string
          servidor_id?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          reference: string | null
          registration_id: string | null
          servidor_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reference?: string | null
          registration_id?: string | null
          servidor_id: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reference?: string | null
          registration_id?: string | null
          servidor_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "crm_client_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fintech_integrations: {
        Row: {
          api_key_encrypted: string | null
          api_key_masked: string | null
          base_url: string | null
          client_id: string | null
          client_secret_encrypted: string | null
          client_secret_masked: string | null
          created_at: string
          display_name: string
          environment: string
          id: string
          is_active: boolean
          last_event_at: string | null
          origin_key_encrypted: string | null
          origin_key_masked: string | null
          provider: string
          public_key: string | null
          servidor_id: string
          updated_at: string
          webhook_secret_encrypted: string | null
          webhook_secret_masked: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          api_key_masked?: string | null
          base_url?: string | null
          client_id?: string | null
          client_secret_encrypted?: string | null
          client_secret_masked?: string | null
          created_at?: string
          display_name: string
          environment?: string
          id?: string
          is_active?: boolean
          last_event_at?: string | null
          origin_key_encrypted?: string | null
          origin_key_masked?: string | null
          provider: string
          public_key?: string | null
          servidor_id: string
          updated_at?: string
          webhook_secret_encrypted?: string | null
          webhook_secret_masked?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          api_key_masked?: string | null
          base_url?: string | null
          client_id?: string | null
          client_secret_encrypted?: string | null
          client_secret_masked?: string | null
          created_at?: string
          display_name?: string
          environment?: string
          id?: string
          is_active?: boolean
          last_event_at?: string | null
          origin_key_encrypted?: string | null
          origin_key_masked?: string | null
          provider?: string
          public_key?: string | null
          servidor_id?: string
          updated_at?: string
          webhook_secret_encrypted?: string | null
          webhook_secret_masked?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fintech_integrations_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fintech_webhook_logs: {
        Row: {
          created_at: string
          direction: string
          endpoint: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          provider: string
          request_payload: Json | null
          response_payload: Json | null
          servidor_id: string
          status: string
          status_code: number | null
        }
        Insert: {
          created_at?: string
          direction?: string
          endpoint?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider: string
          request_payload?: Json | null
          response_payload?: Json | null
          servidor_id: string
          status?: string
          status_code?: number | null
        }
        Update: {
          created_at?: string
          direction?: string
          endpoint?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          request_payload?: Json | null
          response_payload?: Json | null
          servidor_id?: string
          status?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fintech_webhook_logs_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          cancelled_at: string | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          document_hash: string | null
          expires_at: string | null
          generated_with_missing_fields: boolean
          html_content: string | null
          id: string
          lead_id: string
          nome: string
          pdf_path: string | null
          pdf_url: string | null
          proposal_id: string | null
          rendered_variables_json: Json | null
          sent_for_signature_at: string | null
          servidor_id: string
          signed_at: string | null
          signed_pdf_url: string | null
          status: string
          template_id: string | null
          tipo: string
          updated_at: string
          validation_code: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          document_hash?: string | null
          expires_at?: string | null
          generated_with_missing_fields?: boolean
          html_content?: string | null
          id?: string
          lead_id: string
          nome: string
          pdf_path?: string | null
          pdf_url?: string | null
          proposal_id?: string | null
          rendered_variables_json?: Json | null
          sent_for_signature_at?: string | null
          servidor_id: string
          signed_at?: string | null
          signed_pdf_url?: string | null
          status?: string
          template_id?: string | null
          tipo?: string
          updated_at?: string
          validation_code?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          document_hash?: string | null
          expires_at?: string | null
          generated_with_missing_fields?: boolean
          html_content?: string | null
          id?: string
          lead_id?: string
          nome?: string
          pdf_path?: string | null
          pdf_url?: string | null
          proposal_id?: string | null
          rendered_variables_json?: Json | null
          sent_for_signature_at?: string | null
          servidor_id?: string
          signed_at?: string | null
          signed_pdf_url?: string | null
          status?: string
          template_id?: string | null
          tipo?: string
          updated_at?: string
          validation_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_actions: {
        Row: {
          action_type: string
          created_at: string
          endpoint_override: string | null
          field_mapping: Json | null
          id: string
          integration_id: string
          is_active: boolean
          servidor_id: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          endpoint_override?: string | null
          field_mapping?: Json | null
          id?: string
          integration_id: string
          is_active?: boolean
          servidor_id: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          endpoint_override?: string | null
          field_mapping?: Json | null
          id?: string
          integration_id?: string
          is_active?: boolean
          servidor_id?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_actions_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "fintech_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_actions_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          active: boolean
          allow_mark_as_won: boolean
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          is_final: boolean
          name: string
          position: number
          sla_days: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          allow_mark_as_won?: boolean
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          is_final?: boolean
          name: string
          position?: number
          sla_days?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          allow_mark_as_won?: boolean
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          is_final?: boolean
          name?: string
          position?: number
          sla_days?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_url: string
          id: string
          lead_id: string
          servidor_id: string
          uploaded_by_name: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_url: string
          id?: string
          lead_id: string
          servidor_id: string
          uploaded_by_name?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_url?: string
          id?: string
          lead_id?: string
          servidor_id?: string
          uploaded_by_name?: string | null
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_documents_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_post_sale: {
        Row: {
          comprovante_path: string | null
          comprovante_url: string | null
          created_at: string
          email_financeiro: string | null
          id: string
          lead_id: string
          link_proposta_assinada: string | null
          observacoes_venda: string | null
          pessoa_financeira: string | null
          servidor_id: string
          telefone_financeiro: string | null
          updated_at: string
          updated_by_name: string | null
        }
        Insert: {
          comprovante_path?: string | null
          comprovante_url?: string | null
          created_at?: string
          email_financeiro?: string | null
          id?: string
          lead_id: string
          link_proposta_assinada?: string | null
          observacoes_venda?: string | null
          pessoa_financeira?: string | null
          servidor_id: string
          telefone_financeiro?: string | null
          updated_at?: string
          updated_by_name?: string | null
        }
        Update: {
          comprovante_path?: string | null
          comprovante_url?: string | null
          created_at?: string
          email_financeiro?: string | null
          id?: string
          lead_id?: string
          link_proposta_assinada?: string | null
          observacoes_venda?: string | null
          pessoa_financeira?: string | null
          servidor_id?: string
          telefone_financeiro?: string | null
          updated_at?: string
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_post_sale_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_post_sale_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaign_recipients: {
        Row: {
          campaign_id: string
          contact: string
          created_at: string
          error_message: string | null
          id: string
          name: string | null
          provider_message_id: string | null
          sent_at: string | null
          servidor_id: string
          status: string
          updated_at: string
          variables: Json
        }
        Insert: {
          campaign_id: string
          contact: string
          created_at?: string
          error_message?: string | null
          id?: string
          name?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          servidor_id: string
          status?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          campaign_id?: string
          contact?: string
          created_at?: string
          error_message?: string | null
          id?: string
          name?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          servidor_id?: string
          status?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          audience_filter: Json
          audience_source: string
          body: string
          channel: string
          completed_at: string | null
          created_at: string
          created_by: string
          email_connection_id: string | null
          email_provider: string | null
          failed_count: number
          id: string
          last_error: string | null
          media_url: string | null
          name: string
          scheduled_at: string | null
          sent_count: number
          servidor_id: string
          started_at: string | null
          status: string
          subject: string | null
          throttle_max_ms: number
          throttle_min_ms: number
          total_recipients: number
          updated_at: string
          variables: Json
        }
        Insert: {
          audience_filter?: Json
          audience_source?: string
          body?: string
          channel: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          email_connection_id?: string | null
          email_provider?: string | null
          failed_count?: number
          id?: string
          last_error?: string | null
          media_url?: string | null
          name: string
          scheduled_at?: string | null
          sent_count?: number
          servidor_id: string
          started_at?: string | null
          status?: string
          subject?: string | null
          throttle_max_ms?: number
          throttle_min_ms?: number
          total_recipients?: number
          updated_at?: string
          variables?: Json
        }
        Update: {
          audience_filter?: Json
          audience_source?: string
          body?: string
          channel?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          email_connection_id?: string | null
          email_provider?: string | null
          failed_count?: number
          id?: string
          last_error?: string | null
          media_url?: string | null
          name?: string
          scheduled_at?: string | null
          sent_count?: number
          servidor_id?: string
          started_at?: string | null
          status?: string
          subject?: string | null
          throttle_max_ms?: number
          throttle_min_ms?: number
          total_recipients?: number
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fk_marketing_campaigns_email_conn"
            columns: ["email_connection_id"]
            isOneToOne: false
            referencedRelation: "marketing_email_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_email_connections: {
        Row: {
          access_token: string | null
          created_at: string
          daily_send_limit: number
          display_name: string | null
          email_address: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_reset_at: string | null
          provider: string
          refresh_token: string | null
          scope: string | null
          sent_today: number
          servidor_id: string
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          daily_send_limit?: number
          display_name?: string | null
          email_address: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_reset_at?: string | null
          provider: string
          refresh_token?: string | null
          scope?: string | null
          sent_today?: number
          servidor_id: string
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          daily_send_limit?: number
          display_name?: string | null
          email_address?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_reset_at?: string | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          sent_today?: number
          servidor_id?: string
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mass_campaign_recipients: {
        Row: {
          campaign_id: string
          contact: string
          created_at: string
          error: string | null
          id: string
          name: string | null
          sent_at: string | null
          status: string
          tenant_id: string
          variables: Json
        }
        Insert: {
          campaign_id: string
          contact: string
          created_at?: string
          error?: string | null
          id?: string
          name?: string | null
          sent_at?: string | null
          status?: string
          tenant_id: string
          variables?: Json
        }
        Update: {
          campaign_id?: string
          contact?: string
          created_at?: string
          error?: string | null
          id?: string
          name?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "mass_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mass_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      mass_campaigns: {
        Row: {
          audience_mode: string | null
          audience_snapshot: Json
          batch_interval_min: number
          batch_size: number
          body: string | null
          channel: string
          channel_ref: string | null
          content_type: string | null
          created_at: string
          created_by: string | null
          daily_window_end: string | null
          daily_window_start: string | null
          description: string | null
          id: string
          last_dispatch_at: string | null
          name: string
          scheduled_at: string | null
          speed: string
          status: string
          subject: string | null
          template_id: string | null
          tenant_id: string
          totals: Json
          updated_at: string
          variable_mapping: Json
        }
        Insert: {
          audience_mode?: string | null
          audience_snapshot?: Json
          batch_interval_min?: number
          batch_size?: number
          body?: string | null
          channel: string
          channel_ref?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          daily_window_end?: string | null
          daily_window_start?: string | null
          description?: string | null
          id?: string
          last_dispatch_at?: string | null
          name: string
          scheduled_at?: string | null
          speed?: string
          status?: string
          subject?: string | null
          template_id?: string | null
          tenant_id: string
          totals?: Json
          updated_at?: string
          variable_mapping?: Json
        }
        Update: {
          audience_mode?: string | null
          audience_snapshot?: Json
          batch_interval_min?: number
          batch_size?: number
          body?: string | null
          channel?: string
          channel_ref?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          daily_window_end?: string | null
          daily_window_start?: string | null
          description?: string | null
          id?: string
          last_dispatch_at?: string | null
          name?: string
          scheduled_at?: string | null
          speed?: string
          status?: string
          subject?: string | null
          template_id?: string | null
          tenant_id?: string
          totals?: Json
          updated_at?: string
          variable_mapping?: Json
        }
        Relationships: []
      }
      mass_templates: {
        Row: {
          body: string
          category: string | null
          channel: string
          created_at: string
          created_by: string | null
          id: string
          is_favorite: boolean
          name: string
          subject: string | null
          tenant_id: string
          type: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          category?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_favorite?: boolean
          name: string
          subject?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          category?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_favorite?: boolean
          name?: string
          subject?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      master_billing_history: {
        Row: {
          amount: number
          asaas_payment_id: string | null
          bank_slip_url: string | null
          blocking_date: string | null
          created_at: string
          due_date: string
          grace_until: string | null
          id: string
          invoice_url: string | null
          master_client_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          pix_payload: string | null
          pix_qrcode_url: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          asaas_payment_id?: string | null
          bank_slip_url?: string | null
          blocking_date?: string | null
          created_at?: string
          due_date: string
          grace_until?: string | null
          id?: string
          invoice_url?: string | null
          master_client_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_payload?: string | null
          pix_qrcode_url?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_payment_id?: string | null
          bank_slip_url?: string | null
          blocking_date?: string | null
          created_at?: string
          due_date?: string
          grace_until?: string | null
          id?: string
          invoice_url?: string | null
          master_client_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_payload?: string | null
          pix_qrcode_url?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_billing_history_master_client_id_fkey"
            columns: ["master_client_id"]
            isOneToOne: false
            referencedRelation: "master_tenant_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_billing_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      master_tenant_clients: {
        Row: {
          activation_date: string | null
          active_users_count: number | null
          billing_cycle: string
          blocked_at: string | null
          cnpj: string | null
          contracted_users: number | null
          contracted_value: number | null
          created_at: string
          email: string | null
          grace_days: number | null
          grace_until: string | null
          id: string
          master_client_id: string | null
          max_users: number | null
          next_due_date: string | null
          nome_fantasia: string | null
          payment_status: string
          plan_id: string | null
          plan_name: string | null
          razao_social: string | null
          responsavel: string | null
          status: string
          subscription_status: string
          telefone: string | null
          tenant_id: string
          tenant_type: string
          updated_at: string
        }
        Insert: {
          activation_date?: string | null
          active_users_count?: number | null
          billing_cycle?: string
          blocked_at?: string | null
          cnpj?: string | null
          contracted_users?: number | null
          contracted_value?: number | null
          created_at?: string
          email?: string | null
          grace_days?: number | null
          grace_until?: string | null
          id?: string
          master_client_id?: string | null
          max_users?: number | null
          next_due_date?: string | null
          nome_fantasia?: string | null
          payment_status?: string
          plan_id?: string | null
          plan_name?: string | null
          razao_social?: string | null
          responsavel?: string | null
          status?: string
          subscription_status?: string
          telefone?: string | null
          tenant_id: string
          tenant_type?: string
          updated_at?: string
        }
        Update: {
          activation_date?: string | null
          active_users_count?: number | null
          billing_cycle?: string
          blocked_at?: string | null
          cnpj?: string | null
          contracted_users?: number | null
          contracted_value?: number | null
          created_at?: string
          email?: string | null
          grace_days?: number | null
          grace_until?: string | null
          id?: string
          master_client_id?: string | null
          max_users?: number | null
          next_due_date?: string | null
          nome_fantasia?: string | null
          payment_status?: string
          plan_id?: string | null
          plan_name?: string | null
          razao_social?: string | null
          responsavel?: string | null
          status?: string
          subscription_status?: string
          telefone?: string | null
          tenant_id?: string
          tenant_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_tenant_clients_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tenant_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          auto_release_enabled: boolean
          auto_release_timeout_minutes: number
          browser_notification_enabled: boolean
          created_at: string
          id: string
          sound_enabled: boolean
          sound_file: string
          sound_volume: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_release_enabled?: boolean
          auto_release_timeout_minutes?: number
          browser_notification_enabled?: boolean
          created_at?: string
          id?: string
          sound_enabled?: boolean
          sound_file?: string
          sound_volume?: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_release_enabled?: boolean
          auto_release_timeout_minutes?: number
          browser_notification_enabled?: boolean
          created_at?: string
          id?: string
          sound_enabled?: boolean
          sound_file?: string
          sound_volume?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          servidor_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          servidor_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          servidor_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_status: {
        Row: {
          created_at: string
          id: string
          last_changed_at: string
          reason: string | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_changed_at?: string
          reason?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_changed_at?: string
          reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_status_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_status_events: {
        Row: {
          created_at: string
          delay_seconds: number | null
          departments: string[] | null
          duration_seconds: number | null
          ended_at: string | null
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          started_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delay_seconds?: number | null
          departments?: string[] | null
          duration_seconds?: number | null
          ended_at?: string | null
          event_type: string
          id?: string
          metadata?: Json
          reason?: string | null
          started_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          delay_seconds?: number | null
          departments?: string[] | null
          duration_seconds?: number | null
          ended_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          reason?: string | null
          started_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      paddle_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          seat_price_id: string | null
          seats_quantity: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          seat_price_id?: string | null
          seats_quantity?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          seat_price_id?: string | null
          seats_quantity?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paddle_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed?: boolean
          created_at?: string
          expires_at: string
          id?: string
          ip?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          company_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          forma_pagamento: string | null
          id: string
          kiwify_order_id: string
          produto: string | null
          raw_payload: Json | null
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          forma_pagamento?: string | null
          id?: string
          kiwify_order_id: string
          produto?: string | null
          raw_payload?: Json | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          forma_pagamento?: string | null
          id?: string
          kiwify_order_id?: string
          produto?: string | null
          raw_payload?: Json | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_contract_fields: {
        Row: {
          contract_id: string
          created_at: string
          field_type: string
          height: number
          id: string
          label: string | null
          page: number
          pos_x: number
          pos_y: number
          required: boolean
          signer_color: string | null
          signer_id: string | null
          value: string | null
          width: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          field_type?: string
          height?: number
          id?: string
          label?: string | null
          page?: number
          pos_x?: number
          pos_y?: number
          required?: boolean
          signer_color?: string | null
          signer_id?: string | null
          value?: string | null
          width?: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          field_type?: string
          height?: number
          id?: string
          label?: string | null
          page?: number
          pos_x?: number
          pos_y?: number
          required?: boolean
          signer_color?: string | null
          signer_id?: string | null
          value?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdf_contract_fields_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pdf_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_contract_fields_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "pdf_contract_signers"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_contract_history: {
        Row: {
          action: string
          contract_id: string
          created_at: string
          created_by_name: string | null
          description: string | null
          id: string
        }
        Insert: {
          action: string
          contract_id: string
          created_at?: string
          created_by_name?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          action?: string
          contract_id?: string
          created_at?: string
          created_by_name?: string | null
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pdf_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_contract_signers: {
        Row: {
          address: string | null
          contract_id: string
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          sign_order: number
          signature_address: string | null
          signature_latitude: number | null
          signature_longitude: number | null
          signature_photo_url: string | null
          signed_at: string | null
          signer_ip: string | null
          signing_token: string
          status: string
        }
        Insert: {
          address?: string | null
          contract_id: string
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          sign_order?: number
          signature_address?: string | null
          signature_latitude?: number | null
          signature_longitude?: number | null
          signature_photo_url?: string | null
          signed_at?: string | null
          signer_ip?: string | null
          signing_token?: string
          status?: string
        }
        Update: {
          address?: string | null
          contract_id?: string
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          sign_order?: number
          signature_address?: string | null
          signature_latitude?: number | null
          signature_longitude?: number | null
          signature_photo_url?: string | null
          signed_at?: string | null
          signer_ip?: string | null
          signing_token?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_contract_signers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pdf_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_contracts: {
        Row: {
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          description: string | null
          document_hash: string | null
          icp_cert_valid_until: string | null
          icp_pdf_url: string | null
          icp_signed_at: string | null
          icp_signer_cn: string | null
          icp_tsa_authority: string | null
          icp_tsa_token: string | null
          id: string
          name: string
          pdf_assinado_path: string | null
          pdf_assinado_url: string | null
          pdf_path: string
          pdf_url: string
          servidor_id: string
          sign_mode: string
          status: string
          updated_at: string
          validation_code: string | null
        }
        Insert: {
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          document_hash?: string | null
          icp_cert_valid_until?: string | null
          icp_pdf_url?: string | null
          icp_signed_at?: string | null
          icp_signer_cn?: string | null
          icp_tsa_authority?: string | null
          icp_tsa_token?: string | null
          id?: string
          name: string
          pdf_assinado_path?: string | null
          pdf_assinado_url?: string | null
          pdf_path: string
          pdf_url: string
          servidor_id: string
          sign_mode?: string
          status?: string
          updated_at?: string
          validation_code?: string | null
        }
        Update: {
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          document_hash?: string | null
          icp_cert_valid_until?: string | null
          icp_pdf_url?: string | null
          icp_signed_at?: string | null
          icp_signer_cn?: string | null
          icp_tsa_authority?: string | null
          icp_tsa_token?: string | null
          id?: string
          name?: string
          pdf_assinado_path?: string | null
          pdf_assinado_url?: string | null
          pdf_path?: string
          pdf_url?: string
          servidor_id?: string
          sign_mode?: string
          status?: string
          updated_at?: string
          validation_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdf_contracts_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_ai_plans: {
        Row: {
          created_at: string
          data_reavaliacao: string | null
          diagnostico: string | null
          gerado_por: string
          id: string
          meta_recuperacao: string | null
          status: string
          sugestoes: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_reavaliacao?: string | null
          diagnostico?: string | null
          gerado_por?: string
          id?: string
          meta_recuperacao?: string | null
          status?: string
          sugestoes?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_reavaliacao?: string | null
          diagnostico?: string | null
          gerado_por?: string
          id?: string
          meta_recuperacao?: string | null
          status?: string
          sugestoes?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_ai_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_feedbacks: {
        Row: {
          assumed_at: string | null
          checkin_history: Json | null
          checklist: Json | null
          comentario_usuario: string | null
          comment_history: Json | null
          confirmed_at: string | null
          created_at: string
          data: string
          id: string
          observacoes: string | null
          plano_acao: string | null
          pontos_fortes: string | null
          pontos_melhoria: string | null
          proxima_revisao: string | null
          status: string
          supervisor_id: string
          supervisor_name: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          visualizado: boolean
          visualizado_em: string | null
        }
        Insert: {
          assumed_at?: string | null
          checkin_history?: Json | null
          checklist?: Json | null
          comentario_usuario?: string | null
          comment_history?: Json | null
          confirmed_at?: string | null
          created_at?: string
          data?: string
          id?: string
          observacoes?: string | null
          plano_acao?: string | null
          pontos_fortes?: string | null
          pontos_melhoria?: string | null
          proxima_revisao?: string | null
          status?: string
          supervisor_id: string
          supervisor_name?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          visualizado?: boolean
          visualizado_em?: string | null
        }
        Update: {
          assumed_at?: string | null
          checkin_history?: Json | null
          checklist?: Json | null
          comentario_usuario?: string | null
          comment_history?: Json | null
          confirmed_at?: string | null
          created_at?: string
          data?: string
          id?: string
          observacoes?: string | null
          plano_acao?: string | null
          pontos_fortes?: string | null
          pontos_melhoria?: string | null
          proxima_revisao?: string | null
          status?: string
          supervisor_id?: string
          supervisor_name?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          visualizado?: boolean
          visualizado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_feedbacks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_goals: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          meta_config: Json | null
          meta_valor: number
          percentual: number | null
          realizado_valor: number
          resultado_config: Json | null
          team_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          meta_config?: Json | null
          meta_valor?: number
          percentual?: number | null
          realizado_valor?: number
          resultado_config?: Json | null
          team_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          meta_config?: Json | null
          meta_valor?: number
          percentual?: number | null
          realizado_valor?: number
          resultado_config?: Json | null
          team_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "performance_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_hierarchy: {
        Row: {
          created_at: string
          id: string
          leader_id: string
          subordinate_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leader_id: string
          subordinate_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leader_id?: string
          subordinate_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_hierarchy_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_snapshots: {
        Row: {
          conversao: number
          created_at: string
          data: string
          ganhos: number
          id: string
          kpi_data: Json | null
          perdas: number
          score: number
          sla: number
          tarefas_concluidas: number
          team_id: string | null
          tenant_id: string
          user_id: string | null
          valor_total: number
          workspace_id: string | null
        }
        Insert: {
          conversao?: number
          created_at?: string
          data?: string
          ganhos?: number
          id?: string
          kpi_data?: Json | null
          perdas?: number
          score?: number
          sla?: number
          tarefas_concluidas?: number
          team_id?: string | null
          tenant_id: string
          user_id?: string | null
          valor_total?: number
          workspace_id?: string | null
        }
        Update: {
          conversao?: number
          created_at?: string
          data?: string
          ganhos?: number
          id?: string
          kpi_data?: Json | null
          perdas?: number
          score?: number
          sla?: number
          tarefas_concluidas?: number
          team_id?: string | null
          tenant_id?: string
          user_id?: string | null
          valor_total?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "performance_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_team_members: {
        Row: {
          created_at: string
          id: string
          meta_individual: number | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_individual?: number | null
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_individual?: number | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "performance_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_teams: {
        Row: {
          ativo: boolean | null
          created_at: string
          gestor_id: string | null
          id: string
          meta_mensal: number | null
          nome: string
          supervisor_id: string | null
          tenant_id: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          gestor_id?: string | null
          id?: string
          meta_mensal?: number | null
          nome: string
          supervisor_id?: string | null
          tenant_id: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          gestor_id?: string | null
          id?: string
          meta_mensal?: number | null
          nome?: string
          supervisor_id?: string | null
          tenant_id?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admin_access_log: {
        Row: {
          accessed_tenant_id: string
          action: string
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_tenant_id: string
          action: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_tenant_id?: string
          action?: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          company_id: string | null
          cpf: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_master: boolean
          is_trial_user: boolean
          last_assigned_at: string | null
          must_change_password: boolean
          name: string
          preferred_language: string
          signature_completed: boolean
          status: string
          tags: string[] | null
          theme: string
          trial_expires_at: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          is_master?: boolean
          is_trial_user?: boolean
          last_assigned_at?: string | null
          must_change_password?: boolean
          name: string
          preferred_language?: string
          signature_completed?: boolean
          status?: string
          tags?: string[] | null
          theme?: string
          trial_expires_at?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_master?: boolean
          is_trial_user?: boolean
          last_assigned_at?: string | null
          must_change_password?: boolean
          name?: string
          preferred_language?: string
          signature_completed?: boolean
          status?: string
          tags?: string[] | null
          theme?: string
          trial_expires_at?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_brands: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          logo_path: string | null
          logo_url: string | null
          name: string
          servidor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          logo_path?: string | null
          logo_url?: string | null
          name: string
          servidor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          logo_path?: string | null
          logo_url?: string | null
          name?: string
          servidor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_brands_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_catalog_items: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          default_quantity: number
          description: string | null
          id: string
          internal_code: string | null
          internal_notes: string | null
          is_active: boolean
          item_type: string
          name: string
          recurrence_type: string
          servidor_id: string
          updated_at: string
          value: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_quantity?: number
          description?: string | null
          id?: string
          internal_code?: string | null
          internal_notes?: string | null
          is_active?: boolean
          item_type?: string
          name: string
          recurrence_type?: string
          servidor_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_quantity?: number
          description?: string | null
          id?: string
          internal_code?: string | null
          internal_notes?: string | null
          is_active?: boolean
          item_type?: string
          name?: string
          recurrence_type?: string
          servidor_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_catalog_items_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_control_sequences: {
        Row: {
          last_number: number
          servidor_id: string
        }
        Insert: {
          last_number?: number
          servidor_id: string
        }
        Update: {
          last_number?: number
          servidor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_control_sequences_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          servidor_id: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          servidor_id: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          servidor_id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_line_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          item_type: string
          name: string
          position: number
          proposal_id: string
          quantity: number
          servidor_id: string
          total: number
          unit_value: number
          updated_at: string
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          item_type?: string
          name: string
          position?: number
          proposal_id: string
          quantity?: number
          servidor_id: string
          total?: number
          unit_value?: number
          updated_at?: string
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          item_type?: string
          name?: string
          position?: number
          proposal_id?: string
          quantity?: number
          servidor_id?: string
          total?: number
          unit_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_line_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "proposal_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_public_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip: string | null
          payload: Json
          proposal_id: string
          servidor_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip?: string | null
          payload?: Json
          proposal_id: string
          servidor_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip?: string | null
          payload?: Json
          proposal_id?: string
          servidor_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_public_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_public_events_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          default_validity_days: number
          description: string | null
          id: string
          intro_html: string | null
          is_active: boolean
          name: string
          observations: string | null
          servidor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          default_validity_days?: number
          description?: string | null
          id?: string
          intro_html?: string | null
          is_active?: boolean
          name: string
          observations?: string | null
          servidor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          default_validity_days?: number
          description?: string | null
          id?: string
          intro_html?: string | null
          is_active?: boolean
          name?: string
          observations?: string | null
          servidor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_templates_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          approved_at: string | null
          approved_by_name: string | null
          client_oc: string | null
          control_code: string | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          created_date: string
          currency: string
          descricao: string | null
          id: string
          intro_html: string | null
          item_id: string | null
          lead_id: string
          mrr_payment: Json
          observations: string | null
          pdf_url: string | null
          ps_payment: Json
          public_accepted_at: string | null
          public_accepted_doc: string | null
          public_accepted_ip: string | null
          public_accepted_name: string | null
          public_rejected_at: string | null
          public_rejected_reason: string | null
          public_token: string | null
          servidor_id: string
          status: string
          template_id: string | null
          titulo: string
          totals: Json
          updated_at: string
          validity_days: number
          valor: number
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by_name?: string | null
          client_oc?: string | null
          control_code?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          created_date?: string
          currency?: string
          descricao?: string | null
          id?: string
          intro_html?: string | null
          item_id?: string | null
          lead_id: string
          mrr_payment?: Json
          observations?: string | null
          pdf_url?: string | null
          ps_payment?: Json
          public_accepted_at?: string | null
          public_accepted_doc?: string | null
          public_accepted_ip?: string | null
          public_accepted_name?: string | null
          public_rejected_at?: string | null
          public_rejected_reason?: string | null
          public_token?: string | null
          servidor_id: string
          status?: string
          template_id?: string | null
          titulo: string
          totals?: Json
          updated_at?: string
          validity_days?: number
          valor?: number
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by_name?: string | null
          client_oc?: string | null
          control_code?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          created_date?: string
          currency?: string
          descricao?: string | null
          id?: string
          intro_html?: string | null
          item_id?: string | null
          lead_id?: string
          mrr_payment?: Json
          observations?: string | null
          pdf_url?: string | null
          ps_payment?: Json
          public_accepted_at?: string | null
          public_accepted_doc?: string | null
          public_accepted_ip?: string | null
          public_accepted_name?: string | null
          public_rejected_at?: string | null
          public_rejected_reason?: string | null
          public_token?: string | null
          servidor_id?: string
          status?: string
          template_id?: string | null
          titulo?: string
          totals?: Json
          updated_at?: string
          validity_days?: number
          valor?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "proposal_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "proposal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_agent_events: {
        Row: {
          ai_reasoning: string | null
          campaign_id: string
          created_at: string
          detected_intent: string | null
          detected_objection: string | null
          detected_sentiment: string | null
          direction: string | null
          event_type: string
          id: string
          message: string | null
          metadata: Json
          next_goal: string | null
          pulse_lead_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          campaign_id: string
          created_at?: string
          detected_intent?: string | null
          detected_objection?: string | null
          detected_sentiment?: string | null
          direction?: string | null
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json
          next_goal?: string | null
          pulse_lead_id: string
        }
        Update: {
          ai_reasoning?: string | null
          campaign_id?: string
          created_at?: string
          detected_intent?: string | null
          detected_objection?: string | null
          detected_sentiment?: string | null
          direction?: string | null
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json
          next_goal?: string | null
          pulse_lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_agent_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pulse_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_agent_events_pulse_lead_id_fkey"
            columns: ["pulse_lead_id"]
            isOneToOne: false
            referencedRelation: "pulse_outbound_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_agent_settings: {
        Row: {
          auto_pause_on_end_date: boolean | null
          auto_reply_inbound: boolean | null
          auto_start_conversations: boolean | null
          block_outside_window: boolean | null
          campaign_id: string
          created_at: string
          daily_limit: number
          enabled: boolean
          ends_at: string | null
          id: string
          known_objections: string
          main_offer: string
          max_attempts_per_lead: number
          max_delay_minutes: number
          max_messages_per_lead: number | null
          max_negotiation_days: number | null
          min_delay_minutes: number
          playbook: string
          require_approval_first_message: boolean | null
          require_approval_sensitive_objection: boolean | null
          scheduling_instructions: string
          send_weekdays: number[]
          send_window_end: string
          send_window_start: string
          starts_at: string | null
          stop_on_human_request: boolean
          stop_on_meeting: boolean
          stop_on_opt_out: boolean
          timezone: string | null
          tone: string
          updated_at: string
        }
        Insert: {
          auto_pause_on_end_date?: boolean | null
          auto_reply_inbound?: boolean | null
          auto_start_conversations?: boolean | null
          block_outside_window?: boolean | null
          campaign_id: string
          created_at?: string
          daily_limit?: number
          enabled?: boolean
          ends_at?: string | null
          id?: string
          known_objections?: string
          main_offer?: string
          max_attempts_per_lead?: number
          max_delay_minutes?: number
          max_messages_per_lead?: number | null
          max_negotiation_days?: number | null
          min_delay_minutes?: number
          playbook?: string
          require_approval_first_message?: boolean | null
          require_approval_sensitive_objection?: boolean | null
          scheduling_instructions?: string
          send_weekdays?: number[]
          send_window_end?: string
          send_window_start?: string
          starts_at?: string | null
          stop_on_human_request?: boolean
          stop_on_meeting?: boolean
          stop_on_opt_out?: boolean
          timezone?: string | null
          tone?: string
          updated_at?: string
        }
        Update: {
          auto_pause_on_end_date?: boolean | null
          auto_reply_inbound?: boolean | null
          auto_start_conversations?: boolean | null
          block_outside_window?: boolean | null
          campaign_id?: string
          created_at?: string
          daily_limit?: number
          enabled?: boolean
          ends_at?: string | null
          id?: string
          known_objections?: string
          main_offer?: string
          max_attempts_per_lead?: number
          max_delay_minutes?: number
          max_messages_per_lead?: number | null
          max_negotiation_days?: number | null
          min_delay_minutes?: number
          playbook?: string
          require_approval_first_message?: boolean | null
          require_approval_sensitive_objection?: boolean | null
          scheduling_instructions?: string
          send_weekdays?: number[]
          send_window_end?: string
          send_window_start?: string
          starts_at?: string | null
          stop_on_human_request?: boolean
          stop_on_meeting?: boolean
          stop_on_opt_out?: boolean
          timezone?: string | null
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_agent_settings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "pulse_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_campaigns: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          human_delay_minutes: number
          id: string
          max_daily_messages: number
          name: string
          objective: string
          offer: string
          status: string
          tone: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          human_delay_minutes?: number
          id?: string
          max_daily_messages?: number
          name: string
          objective?: string
          offer?: string
          status?: string
          tone?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          human_delay_minutes?: number
          id?: string
          max_daily_messages?: number
          name?: string
          objective?: string
          offer?: string
          status?: string
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_knowledge_base: {
        Row: {
          campaign_id: string
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_knowledge_base_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pulse_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_outbound_leads: {
        Row: {
          ai_typing: boolean | null
          attempts: number
          auto_enabled: boolean
          campaign_id: string
          conversation_summary: string | null
          created_at: string
          crm_lead_id: string
          id: string
          intent: string | null
          internal_ai_note: string | null
          last_ai_recommendation: string | null
          last_inbound_at: string | null
          last_objection: string | null
          last_outbound_at: string | null
          last_sent_at: string | null
          manual_takeover_at: string | null
          manual_takeover_by: string | null
          max_attempts: number | null
          meeting_at: string | null
          messages_sent: number
          metadata: Json
          needs_human: boolean
          negotiation_ends_at: string | null
          negotiation_started_at: string | null
          next_action_at: string | null
          next_action_type: string
          next_goal: string | null
          next_message: string | null
          opt_out: boolean
          sentiment: string | null
          stage: string
          status: string
          temperature: number
          updated_at: string
          whatsapp_contact_id: string | null
        }
        Insert: {
          ai_typing?: boolean | null
          attempts?: number
          auto_enabled?: boolean
          campaign_id: string
          conversation_summary?: string | null
          created_at?: string
          crm_lead_id: string
          id?: string
          intent?: string | null
          internal_ai_note?: string | null
          last_ai_recommendation?: string | null
          last_inbound_at?: string | null
          last_objection?: string | null
          last_outbound_at?: string | null
          last_sent_at?: string | null
          manual_takeover_at?: string | null
          manual_takeover_by?: string | null
          max_attempts?: number | null
          meeting_at?: string | null
          messages_sent?: number
          metadata?: Json
          needs_human?: boolean
          negotiation_ends_at?: string | null
          negotiation_started_at?: string | null
          next_action_at?: string | null
          next_action_type?: string
          next_goal?: string | null
          next_message?: string | null
          opt_out?: boolean
          sentiment?: string | null
          stage?: string
          status?: string
          temperature?: number
          updated_at?: string
          whatsapp_contact_id?: string | null
        }
        Update: {
          ai_typing?: boolean | null
          attempts?: number
          auto_enabled?: boolean
          campaign_id?: string
          conversation_summary?: string | null
          created_at?: string
          crm_lead_id?: string
          id?: string
          intent?: string | null
          internal_ai_note?: string | null
          last_ai_recommendation?: string | null
          last_inbound_at?: string | null
          last_objection?: string | null
          last_outbound_at?: string | null
          last_sent_at?: string | null
          manual_takeover_at?: string | null
          manual_takeover_by?: string | null
          max_attempts?: number | null
          meeting_at?: string | null
          messages_sent?: number
          metadata?: Json
          needs_human?: boolean
          negotiation_ends_at?: string | null
          negotiation_started_at?: string | null
          next_action_at?: string | null
          next_action_type?: string
          next_goal?: string | null
          next_message?: string | null
          opt_out?: boolean
          sentiment?: string | null
          stage?: string
          status?: string
          temperature?: number
          updated_at?: string
          whatsapp_contact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_outbound_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pulse_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_outbound_leads_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_outbound_leads_whatsapp_contact_id_fkey"
            columns: ["whatsapp_contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          last_used_at: string | null
          p256dh_key: string
          tenant_id: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh_key: string
          tenant_id: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh_key?: string
          tenant_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_default_permissions: {
        Row: {
          created_at: string
          data_scope: string
          id: string
          module: string | null
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          data_scope?: string
          id?: string
          module?: string | null
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          data_scope?: string
          id?: string
          module?: string | null
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      sdr_leads: {
        Row: {
          channel: string | null
          company: string | null
          created_at: string
          disc: string | null
          email: string | null
          id: string
          last_touch_at: string | null
          name: string
          next_touch_at: string | null
          notes: string | null
          origin: string
          owner_id: string | null
          phone: string | null
          promoted_lead_id: string | null
          promoted_workspace_id: string | null
          qual: Json
          qualified_at: string | null
          sequence_day: number
          servidor_id: string
          stage: string
          temperature: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          channel?: string | null
          company?: string | null
          created_at?: string
          disc?: string | null
          email?: string | null
          id?: string
          last_touch_at?: string | null
          name: string
          next_touch_at?: string | null
          notes?: string | null
          origin?: string
          owner_id?: string | null
          phone?: string | null
          promoted_lead_id?: string | null
          promoted_workspace_id?: string | null
          qual?: Json
          qualified_at?: string | null
          sequence_day?: number
          servidor_id: string
          stage?: string
          temperature?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          channel?: string | null
          company?: string | null
          created_at?: string
          disc?: string | null
          email?: string | null
          id?: string
          last_touch_at?: string | null
          name?: string
          next_touch_at?: string | null
          notes?: string | null
          origin?: string
          owner_id?: string | null
          phone?: string | null
          promoted_lead_id?: string | null
          promoted_workspace_id?: string | null
          qual?: Json
          qualified_at?: string | null
          sequence_day?: number
          servidor_id?: string
          stage?: string
          temperature?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdr_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_sequence_events: {
        Row: {
          channel: string
          created_by: string | null
          day: number
          id: string
          message: string | null
          response: string | null
          sdr_lead_id: string
          sent_at: string
        }
        Insert: {
          channel: string
          created_by?: string | null
          day: number
          id?: string
          message?: string | null
          response?: string | null
          sdr_lead_id: string
          sent_at?: string
        }
        Update: {
          channel?: string
          created_by?: string | null
          day?: number
          id?: string
          message?: string | null
          response?: string | null
          sdr_lead_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdr_sequence_events_sdr_lead_id_fkey"
            columns: ["sdr_lead_id"]
            isOneToOne: false
            referencedRelation: "sdr_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      service_classifications: {
        Row: {
          color: string
          created_at: string
          department_ids: string[]
          distribution_rule: Json
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          department_ids?: string[]
          distribution_rule?: Json
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          department_ids?: string[]
          distribution_rule?: Json
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_classifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_holidays: {
        Row: {
          auto_message: string | null
          coverage: string
          created_at: string
          date: string
          department_id: string | null
          id: string
          name: string
          recurring: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_message?: string | null
          coverage?: string
          created_at?: string
          date: string
          department_id?: string | null
          id?: string
          name: string
          recurring?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_message?: string | null
          coverage?: string
          created_at?: string
          date?: string
          department_id?: string | null
          id?: string
          name?: string
          recurring?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_holidays_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "tenant_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_holidays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_settings: {
        Row: {
          allow_audio: boolean
          allow_emoji: boolean
          allow_export_pdf: boolean
          allow_files: boolean
          allow_stickers: boolean
          block_transfer_to_offline: boolean
          business_hours: Json
          created_at: string
          delivery_mode: string
          distribution_type: string
          keep_history_on_transfer: boolean
          max_active_per_agent: number
          max_receptive_per_agent: number
          move_to_wait_on_transfer: boolean
          msg_closing: string | null
          msg_greeting: string | null
          msg_transfer: string | null
          msg_wait: string | null
          off_hours_message: string | null
          require_transfer_note: boolean
          show_agent_name: boolean
          tenant_id: string
          tickets_per_cycle: number
          updated_at: string
        }
        Insert: {
          allow_audio?: boolean
          allow_emoji?: boolean
          allow_export_pdf?: boolean
          allow_files?: boolean
          allow_stickers?: boolean
          block_transfer_to_offline?: boolean
          business_hours?: Json
          created_at?: string
          delivery_mode?: string
          distribution_type?: string
          keep_history_on_transfer?: boolean
          max_active_per_agent?: number
          max_receptive_per_agent?: number
          move_to_wait_on_transfer?: boolean
          msg_closing?: string | null
          msg_greeting?: string | null
          msg_transfer?: string | null
          msg_wait?: string | null
          off_hours_message?: string | null
          require_transfer_note?: boolean
          show_agent_name?: boolean
          tenant_id: string
          tickets_per_cycle?: number
          updated_at?: string
        }
        Update: {
          allow_audio?: boolean
          allow_emoji?: boolean
          allow_export_pdf?: boolean
          allow_files?: boolean
          allow_stickers?: boolean
          block_transfer_to_offline?: boolean
          business_hours?: Json
          created_at?: string
          delivery_mode?: string
          distribution_type?: string
          keep_history_on_transfer?: boolean
          max_active_per_agent?: number
          max_receptive_per_agent?: number
          move_to_wait_on_transfer?: boolean
          msg_closing?: string | null
          msg_greeting?: string | null
          msg_transfer?: string | null
          msg_wait?: string | null
          off_hours_message?: string | null
          require_transfer_note?: boolean
          show_agent_name?: boolean
          tenant_id?: string
          tickets_per_cycle?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_extras: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_selected: boolean
          name: string
          subscription_id: string | null
          tenant_id: string
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_selected?: boolean
          name: string
          subscription_id?: string | null
          tenant_id: string
          type?: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_selected?: boolean
          name?: string
          subscription_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_extras_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_extras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_error_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          module: string
          severity: string
          stack_trace: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          module: string
          severity?: string
          stack_trace?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          module?: string
          severity?: string
          stack_trace?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_error_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_channels: {
        Row: {
          channel_label: string | null
          channel_ref_id: string | null
          channel_type: string
          config: Json
          created_at: string
          id: string
          is_enabled: boolean
          receive_rule: string
          team_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel_label?: string | null
          channel_ref_id?: string | null
          channel_type: string
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          receive_rule?: string
          team_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel_label?: string | null
          channel_ref_id?: string | null
          channel_type?: string
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          receive_rule?: string
          team_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_channels_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "chatbot_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_availability: {
        Row: {
          break_until: string | null
          presence_status: string
          since: string
          status_reason: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          break_until?: string | null
          presence_status?: string
          since?: string
          status_reason?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          break_until?: string | null
          presence_status?: string
          since?: string
          status_reason?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_availability_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_specialties: {
        Row: {
          created_at: string
          id: string
          team_id: string
          tenant_id: string
          topic: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          tenant_id: string
          topic: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          tenant_id?: string
          topic?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_specialties_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "chatbot_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_specialties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_asaas_customers: {
        Row: {
          asaas_customer_id: string
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          local_customer_id: string
          name: string | null
          phone: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          asaas_customer_id: string
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          local_customer_id: string
          name?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          asaas_customer_id?: string
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          local_customer_id?: string
          name?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_asaas_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_asaas_payments: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string
          bank_slip_url: string | null
          bar_code: string | null
          billing_type: string
          boleto_viewed_at: string | null
          checkout_viewed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          external_reference: string | null
          id: string
          identification_field: string | null
          installment_count: number | null
          installment_id: string | null
          installment_value: number | null
          invoice_url: string | null
          local_contract_id: string | null
          local_customer_id: string | null
          local_proposal_id: string | null
          local_sale_id: string | null
          net_value: number | null
          nosso_numero: string | null
          original_value: number | null
          payment_date: string | null
          pix_expiration: string | null
          pix_payload: string | null
          pix_qrcode_url: string | null
          raw_payload: Json | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id: string
          bank_slip_url?: string | null
          bar_code?: string | null
          billing_type?: string
          boleto_viewed_at?: string | null
          checkout_viewed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          external_reference?: string | null
          id?: string
          identification_field?: string | null
          installment_count?: number | null
          installment_id?: string | null
          installment_value?: number | null
          invoice_url?: string | null
          local_contract_id?: string | null
          local_customer_id?: string | null
          local_proposal_id?: string | null
          local_sale_id?: string | null
          net_value?: number | null
          nosso_numero?: string | null
          original_value?: number | null
          payment_date?: string | null
          pix_expiration?: string | null
          pix_payload?: string | null
          pix_qrcode_url?: string | null
          raw_payload?: Json | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string
          bank_slip_url?: string | null
          bar_code?: string | null
          billing_type?: string
          boleto_viewed_at?: string | null
          checkout_viewed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          external_reference?: string | null
          id?: string
          identification_field?: string | null
          installment_count?: number | null
          installment_id?: string | null
          installment_value?: number | null
          invoice_url?: string | null
          local_contract_id?: string | null
          local_customer_id?: string | null
          local_proposal_id?: string | null
          local_sale_id?: string | null
          net_value?: number | null
          nosso_numero?: string | null
          original_value?: number | null
          payment_date?: string | null
          pix_expiration?: string | null
          pix_payload?: string | null
          pix_qrcode_url?: string | null
          raw_payload?: Json | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_asaas_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_asaas_subscriptions: {
        Row: {
          asaas_customer_id: string
          asaas_subscription_id: string
          billing_type: string
          created_at: string | null
          cycle: string
          description: string | null
          end_date: string | null
          external_reference: string | null
          id: string
          local_customer_id: string | null
          next_due_date: string | null
          raw_payload: Json | null
          status: string
          tenant_id: string
          updated_at: string | null
          value: number
        }
        Insert: {
          asaas_customer_id: string
          asaas_subscription_id: string
          billing_type?: string
          created_at?: string | null
          cycle?: string
          description?: string | null
          end_date?: string | null
          external_reference?: string | null
          id?: string
          local_customer_id?: string | null
          next_due_date?: string | null
          raw_payload?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          value: number
        }
        Update: {
          asaas_customer_id?: string
          asaas_subscription_id?: string
          billing_type?: string
          created_at?: string | null
          cycle?: string
          description?: string | null
          end_date?: string | null
          external_reference?: string | null
          id?: string
          local_customer_id?: string | null
          next_due_date?: string | null
          raw_payload?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_asaas_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_asaas_webhook_events: {
        Row: {
          asaas_payment_id: string | null
          event_id: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          received_at: string | null
          tenant_id: string
        }
        Insert: {
          asaas_payment_id?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          received_at?: string | null
          tenant_id: string
        }
        Update: {
          asaas_payment_id?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          received_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_asaas_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_certificates: {
        Row: {
          ambiente_assinatura: string | null
          ambiente_nfe: string | null
          created_at: string
          environment: string
          holder_document: string | null
          holder_name: string | null
          id: string
          is_active: boolean
          is_global: boolean
          is_icp_brasil: boolean
          issuer: string | null
          last_test_at: string | null
          last_test_message: string | null
          last_test_status: string | null
          name: string
          password_encrypted: string
          password_iv: string
          serial_number: string | null
          storage_path: string
          tenant_id: string | null
          updated_at: string
          uploaded_by: string | null
          use_master_global: boolean
          uso_assinatura_contratos: boolean
          uso_nfe: boolean
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          ambiente_assinatura?: string | null
          ambiente_nfe?: string | null
          created_at?: string
          environment?: string
          holder_document?: string | null
          holder_name?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          is_icp_brasil?: boolean
          issuer?: string | null
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          name: string
          password_encrypted: string
          password_iv: string
          serial_number?: string | null
          storage_path: string
          tenant_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          use_master_global?: boolean
          uso_assinatura_contratos?: boolean
          uso_nfe?: boolean
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          ambiente_assinatura?: string | null
          ambiente_nfe?: string | null
          created_at?: string
          environment?: string
          holder_document?: string | null
          holder_name?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          is_icp_brasil?: boolean
          issuer?: string | null
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          name?: string
          password_encrypted?: string
          password_iv?: string
          serial_number?: string | null
          storage_path?: string
          tenant_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          use_master_global?: boolean
          uso_assinatura_contratos?: boolean
          uso_nfe?: boolean
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_certificates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_contract_sequences: {
        Row: {
          last_number: number
          servidor_id: string
        }
        Insert: {
          last_number?: number
          servidor_id: string
        }
        Update: {
          last_number?: number
          servidor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_contract_sequences_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_departments: {
        Row: {
          auto_response_message: string | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          position: number
          routing_method: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_response_message?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          routing_method?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_response_message?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          routing_method?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_event_confirmations: {
        Row: {
          confirmed_at: string | null
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_event_confirmations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "tenant_events"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_events: {
        Row: {
          banner_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          event_type: string
          highlight_on_home: boolean
          id: string
          is_mandatory: boolean
          location: string | null
          meeting_url: string | null
          reminder_minutes: number[] | null
          start_at: string
          status: string
          target_mode: string
          tenant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          highlight_on_home?: boolean
          id?: string
          is_mandatory?: boolean
          location?: string | null
          meeting_url?: string | null
          reminder_minutes?: number[] | null
          start_at: string
          status?: string
          target_mode?: string
          tenant_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          highlight_on_home?: boolean
          id?: string
          is_mandatory?: boolean
          location?: string | null
          meeting_url?: string | null
          reminder_minutes?: number[] | null
          start_at?: string
          status?: string
          target_mode?: string
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_financial_config: {
        Row: {
          created_at: string
          id: string
          pix_beneficiary: string | null
          pix_default_description: string | null
          pix_document: string | null
          pix_key: string | null
          pix_key_type: string | null
          servidor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pix_beneficiary?: string | null
          pix_default_description?: string | null
          pix_document?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          servidor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pix_beneficiary?: string | null
          pix_default_description?: string | null
          pix_document?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          servidor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_financial_config_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_fintech_integrations: {
        Row: {
          api_key_encrypted: string | null
          api_key_masked: string | null
          connection_status: string | null
          created_at: string | null
          created_by: string | null
          environment: string
          id: string
          last_connection_check_at: string | null
          last_connection_error: string | null
          last_webhook_event: string | null
          last_webhook_received_at: string | null
          provider: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
          webhook_auth_token: string | null
          webhook_enabled: boolean | null
          webhook_remote_id: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          api_key_masked?: string | null
          connection_status?: string | null
          created_at?: string | null
          created_by?: string | null
          environment?: string
          id?: string
          last_connection_check_at?: string | null
          last_connection_error?: string | null
          last_webhook_event?: string | null
          last_webhook_received_at?: string | null
          provider?: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
          webhook_auth_token?: string | null
          webhook_enabled?: boolean | null
          webhook_remote_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          api_key_masked?: string | null
          connection_status?: string | null
          created_at?: string | null
          created_by?: string | null
          environment?: string
          id?: string
          last_connection_check_at?: string | null
          last_connection_error?: string | null
          last_webhook_event?: string | null
          last_webhook_received_at?: string | null
          provider?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          webhook_auth_token?: string | null
          webhook_enabled?: boolean | null
          webhook_remote_id?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_fintech_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invoices: {
        Row: {
          amount: number
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          bank_slip_url: string | null
          bar_code: string | null
          billing_type: string | null
          blocking_date: string | null
          created_at: string
          due_date: string | null
          external_reference: string | null
          grace_until: string | null
          id: string
          identification_field: string | null
          invoice_number: string | null
          invoice_url: string | null
          is_current: boolean | null
          last_status_sync_at: string | null
          paid_at: string | null
          payment_method_label: string | null
          pix_payload: string | null
          pix_qrcode_url: string | null
          raw_asaas_payload: Json | null
          status: string
          subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          bank_slip_url?: string | null
          bar_code?: string | null
          billing_type?: string | null
          blocking_date?: string | null
          created_at?: string
          due_date?: string | null
          external_reference?: string | null
          grace_until?: string | null
          id?: string
          identification_field?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          is_current?: boolean | null
          last_status_sync_at?: string | null
          paid_at?: string | null
          payment_method_label?: string | null
          pix_payload?: string | null
          pix_qrcode_url?: string | null
          raw_asaas_payload?: Json | null
          status?: string
          subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          bank_slip_url?: string | null
          bar_code?: string | null
          billing_type?: string | null
          blocking_date?: string | null
          created_at?: string
          due_date?: string | null
          external_reference?: string | null
          grace_until?: string | null
          id?: string
          identification_field?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          is_current?: boolean | null
          last_status_sync_at?: string | null
          paid_at?: string | null
          payment_method_label?: string | null
          pix_payload?: string | null
          pix_qrcode_url?: string | null
          raw_asaas_payload?: Json | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_setup_requests: {
        Row: {
          activated_at: string | null
          bairro: string | null
          brand_accent_color: string | null
          brand_bg_color: string | null
          brand_logo_url: string | null
          brand_primary_color: string | null
          brand_secondary_color: string | null
          brand_text_color: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome_fantasia: string | null
          numero: string | null
          razao_social: string | null
          responsavel: string | null
          resulting_company_id: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          submitted_at: string | null
          telefone: string | null
          token: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          bairro?: string | null
          brand_accent_color?: string | null
          brand_bg_color?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          brand_text_color?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string | null
          responsavel?: string | null
          resulting_company_id?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string | null
          telefone?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          bairro?: string | null
          brand_accent_color?: string | null
          brand_bg_color?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          brand_text_color?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string | null
          responsavel?: string | null
          resulting_company_id?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string | null
          telefone?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_setup_requests_resulting_company_id_fkey"
            columns: ["resulting_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscription_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          id: string
          new_base_limit: number | null
          new_effective_user_limit: number | null
          new_extra_free_users: number | null
          new_extra_paid_users: number | null
          new_plan_name: string | null
          old_base_limit: number | null
          old_effective_user_limit: number | null
          old_extra_free_users: number | null
          old_extra_paid_users: number | null
          old_plan_name: string | null
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_base_limit?: number | null
          new_effective_user_limit?: number | null
          new_extra_free_users?: number | null
          new_extra_paid_users?: number | null
          new_plan_name?: string | null
          old_base_limit?: number | null
          old_effective_user_limit?: number | null
          old_extra_free_users?: number | null
          old_extra_paid_users?: number | null
          old_plan_name?: string | null
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_base_limit?: number | null
          new_effective_user_limit?: number | null
          new_extra_free_users?: number | null
          new_extra_paid_users?: number | null
          new_plan_name?: string | null
          old_base_limit?: number | null
          old_effective_user_limit?: number | null
          old_extra_free_users?: number | null
          old_extra_paid_users?: number | null
          old_plan_name?: string | null
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscription_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          base_user_limit_snapshot: number
          billing_cycle: string
          billing_status: string
          blocked_at: string | null
          created_at: string
          effective_user_limit: number
          expires_at: string | null
          extra_free_users: number
          extra_paid_users: number
          grace_days: number | null
          grace_until: string | null
          has_custom_override: boolean
          id: string
          last_payment_date: string | null
          monthly_price_snapshot: number
          next_due_date: string | null
          payment_status: string | null
          plan_id: string | null
          plan_name_snapshot: string
          price_per_extra_user_snapshot: number
          start_date: string | null
          tenant_id: string
          total_extras_recorrentes: number
          total_extras_unicos: number
          updated_at: string
          valor_base_plano: number
          valor_inicial_total: number
          valor_mensal_total: number
          yearly_price_snapshot: number
        }
        Insert: {
          base_user_limit_snapshot?: number
          billing_cycle?: string
          billing_status?: string
          blocked_at?: string | null
          created_at?: string
          effective_user_limit?: number
          expires_at?: string | null
          extra_free_users?: number
          extra_paid_users?: number
          grace_days?: number | null
          grace_until?: string | null
          has_custom_override?: boolean
          id?: string
          last_payment_date?: string | null
          monthly_price_snapshot?: number
          next_due_date?: string | null
          payment_status?: string | null
          plan_id?: string | null
          plan_name_snapshot?: string
          price_per_extra_user_snapshot?: number
          start_date?: string | null
          tenant_id: string
          total_extras_recorrentes?: number
          total_extras_unicos?: number
          updated_at?: string
          valor_base_plano?: number
          valor_inicial_total?: number
          valor_mensal_total?: number
          yearly_price_snapshot?: number
        }
        Update: {
          base_user_limit_snapshot?: number
          billing_cycle?: string
          billing_status?: string
          blocked_at?: string | null
          created_at?: string
          effective_user_limit?: number
          expires_at?: string | null
          extra_free_users?: number
          extra_paid_users?: number
          grace_days?: number | null
          grace_until?: string | null
          has_custom_override?: boolean
          id?: string
          last_payment_date?: string | null
          monthly_price_snapshot?: number
          next_due_date?: string | null
          payment_status?: string | null
          plan_id?: string | null
          plan_name_snapshot?: string
          price_per_extra_user_snapshot?: number
          start_date?: string | null
          tenant_id?: string
          total_extras_recorrentes?: number
          total_extras_unicos?: number
          updated_at?: string
          valor_base_plano?: number
          valor_inicial_total?: number
          valor_mensal_total?: number
          yearly_price_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_whatsapp_integrations: {
        Row: {
          add_events_in_url: boolean
          add_message_types_in_url: boolean
          connected_phone: string | null
          connection_status: string
          created_at: string
          exclude_events: string
          id: string
          instance_id: string | null
          instance_name: string | null
          instance_token: string | null
          is_active: boolean
          last_seen_at: string | null
          last_sync_at: string | null
          last_test_message: string | null
          last_test_status: string | null
          last_tested_at: string | null
          last_webhook_test_at: string | null
          last_webhook_test_status: string | null
          listen_events: string
          provider_metadata: Json
          provider_type: string
          publish_status: string
          server_url: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          webhook_enabled: boolean
          webhook_url: string | null
          webhook_url_final: string | null
        }
        Insert: {
          add_events_in_url?: boolean
          add_message_types_in_url?: boolean
          connected_phone?: string | null
          connection_status?: string
          created_at?: string
          exclude_events?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          instance_token?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          last_sync_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          last_webhook_test_at?: string | null
          last_webhook_test_status?: string | null
          listen_events?: string
          provider_metadata?: Json
          provider_type: string
          publish_status?: string
          server_url?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          webhook_enabled?: boolean
          webhook_url?: string | null
          webhook_url_final?: string | null
        }
        Update: {
          add_events_in_url?: boolean
          add_message_types_in_url?: boolean
          connected_phone?: string | null
          connection_status?: string
          created_at?: string
          exclude_events?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          instance_token?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          last_sync_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          last_webhook_test_at?: string | null
          last_webhook_test_status?: string | null
          listen_events?: string
          provider_metadata?: Json
          provider_type?: string
          publish_status?: string
          server_url?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          webhook_enabled?: boolean
          webhook_url?: string | null
          webhook_url_final?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_whatsapp_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_custom_permissions: {
        Row: {
          created_at: string
          data_scope: string
          granted: boolean
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_scope?: string
          granted?: boolean
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_scope?: string
          granted?: boolean
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_departments: {
        Row: {
          created_at: string
          department_id: string
          id: string
          is_active: boolean
          priority: number
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          is_active?: boolean
          priority?: number
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          is_active?: boolean
          priority?: number
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "tenant_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          servidor_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          servidor_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          servidor_id?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          meta_valor: number
          tenant_id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          meta_valor?: number
          tenant_id: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          meta_valor?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string | null
          company_name: string | null
          created_at: string
          expires_at: string
          id: string
          invitee_birth_date: string | null
          invitee_cpf: string | null
          invitee_email: string
          invitee_name: string
          invitee_whatsapp: string | null
          inviter_name: string | null
          inviter_user_id: string
          role: string
          status: string
          token: string
          trial_expires_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitee_birth_date?: string | null
          invitee_cpf?: string | null
          invitee_email: string
          invitee_name: string
          invitee_whatsapp?: string | null
          inviter_name?: string | null
          inviter_user_id: string
          role?: string
          status?: string
          token?: string
          trial_expires_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitee_birth_date?: string | null
          invitee_cpf?: string | null
          invitee_email?: string
          invitee_name?: string
          invitee_whatsapp?: string | null
          inviter_name?: string | null
          inviter_user_id?: string
          role?: string
          status?: string
          token?: string
          trial_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      user_signatures: {
        Row: {
          birth_date: string | null
          cargo: string | null
          cpf: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          signature_hash: string | null
          signature_image_url: string | null
          signature_type: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          cargo?: string | null
          cpf: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          signature_hash?: string | null
          signature_image_url?: string | null
          signature_type?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          cargo?: string | null
          cpf?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          signature_hash?: string | null
          signature_image_url?: string | null
          signature_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tenants: {
        Row: {
          allowed_workspace_ids: string[] | null
          created_at: string
          custom_permissions: Json | null
          data_scope: string
          id: string
          role: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_workspace_ids?: string[] | null
          created_at?: string
          custom_permissions?: Json | null
          data_scope?: string
          id?: string
          role?: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_workspace_ids?: string[] | null
          created_at?: string
          custom_permissions?: Json | null
          data_scope?: string
          id?: string
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workspace_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          tenant_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workspace_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workspace_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_orbit: {
        Row: {
          aluno_email: string
          aluno_nome: string
          created_at: string
          data_venda: string
          gateway: string
          id: string
          mentor_id: string
          mentor_nome: string
          produto: string
          transacao_id: string
          valor: number
        }
        Insert: {
          aluno_email: string
          aluno_nome: string
          created_at?: string
          data_venda?: string
          gateway?: string
          id?: string
          mentor_id: string
          mentor_nome: string
          produto: string
          transacao_id: string
          valor?: number
        }
        Update: {
          aluno_email?: string
          aluno_nome?: string
          created_at?: string
          data_venda?: string
          gateway?: string
          id?: string
          mentor_id?: string
          mentor_nome?: string
          produto?: string
          transacao_id?: string
          valor?: number
        }
        Relationships: []
      }
      vendas_webhook: {
        Row: {
          created_at: string
          data_venda: string
          email_aluno: string
          id: string
          mentor_id: string
          mentor_nome: string
          nome_aluno: string
          origem: string
          produto: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_venda?: string
          email_aluno: string
          id?: string
          mentor_id: string
          mentor_nome: string
          nome_aluno: string
          origem?: string
          produto: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_venda?: string
          email_aluno?: string
          id?: string
          mentor_id?: string
          mentor_nome?: string
          nome_aluno?: string
          origem?: string
          produto?: string
          valor?: number
        }
        Relationships: []
      }
      whatsapp_automations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          response_text: string | null
          trigger_type: string
          trigger_value: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          response_text?: string | null
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          response_text?: string | null
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_calls: {
        Row: {
          answered_at: string | null
          answered_by_user_id: string | null
          call_type: string
          caller_avatar: string | null
          caller_name: string | null
          company_id: string
          contact_id: string
          contact_name: string | null
          contact_phone: string
          created_at: string
          deleted_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          initiated_by_user_id: string | null
          metadata: Json
          notes: string | null
          rejection_reason: string | null
          started_at: string | null
          status: string
          uazapi_call_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          answered_at?: string | null
          answered_by_user_id?: string | null
          call_type: string
          caller_avatar?: string | null
          caller_name?: string | null
          company_id: string
          contact_id: string
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by_user_id?: string | null
          metadata?: Json
          notes?: string | null
          rejection_reason?: string | null
          started_at?: string | null
          status?: string
          uazapi_call_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          answered_at?: string | null
          answered_by_user_id?: string | null
          call_type?: string
          caller_avatar?: string | null
          caller_name?: string | null
          company_id?: string
          contact_id?: string
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by_user_id?: string | null
          metadata?: Json
          notes?: string | null
          rejection_reason?: string | null
          started_at?: string | null
          status?: string
          uazapi_call_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_calls_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          folder_id: string
          id: string
          message_type: string | null
          name: string
          scheduled_for: string | null
          status: string
          tenant_id: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder_id: string
          id?: string
          message_type?: string | null
          name: string
          scheduled_for?: string | null
          status?: string
          tenant_id: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder_id?: string
          id?: string
          message_type?: string | null
          name?: string
          scheduled_for?: string | null
          status?: string
          tenant_id?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_chat_pins: {
        Row: {
          company_id: string
          contact_id: string
          id: string
          order_position: number | null
          pinned_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          contact_id: string
          id?: string
          order_position?: number | null
          pinned_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          contact_id?: string
          id?: string
          order_position?: number | null
          pinned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chat_pins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chat_pins_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_chats: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_archived: boolean
          is_group: boolean
          is_pinned: boolean
          last_message_at: string | null
          last_message_text: string | null
          last_message_type: string | null
          lead_id: string | null
          name: string | null
          tenant_id: string
          unread_count: number
          updated_at: string
          wa_chatid: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_archived?: boolean
          is_group?: boolean
          is_pinned?: boolean
          last_message_at?: string | null
          last_message_text?: string | null
          last_message_type?: string | null
          lead_id?: string | null
          name?: string | null
          tenant_id: string
          unread_count?: number
          updated_at?: string
          wa_chatid: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_archived?: boolean
          is_group?: boolean
          is_pinned?: boolean
          last_message_at?: string | null
          last_message_text?: string | null
          last_message_type?: string | null
          lead_id?: string | null
          name?: string | null
          tenant_id?: string
          unread_count?: number
          updated_at?: string
          wa_chatid?: string
        }
        Relationships: []
      }
      whatsapp_contacts: {
        Row: {
          assigned_to: string | null
          avatar_synced_at: string | null
          avatar_url: string | null
          company_id: string
          conversation_status: string
          created_at: string
          department_id: string | null
          id: string
          labels: string[] | null
          last_message: string | null
          last_message_at: string | null
          lead_id: string | null
          name: string
          notes: string | null
          phone: string
          routed_by_department: boolean
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          avatar_synced_at?: string | null
          avatar_url?: string | null
          company_id: string
          conversation_status?: string
          created_at?: string
          department_id?: string | null
          id?: string
          labels?: string[] | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          name: string
          notes?: string | null
          phone: string
          routed_by_department?: boolean
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          avatar_synced_at?: string | null
          avatar_url?: string | null
          company_id?: string
          conversation_status?: string
          created_at?: string
          department_id?: string | null
          id?: string
          labels?: string[] | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          name?: string
          notes?: string | null
          phone?: string
          routed_by_department?: boolean
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "tenant_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          id: string
          instance_name: string | null
          last_chats_sync_at: string | null
          phone_number: string | null
          profile_name: string | null
          profile_pic_url: string | null
          status: string
          tenant_id: string
          uazapi_instance_id: string | null
          uazapi_token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_name?: string | null
          last_chats_sync_at?: string | null
          phone_number?: string | null
          profile_name?: string | null
          profile_pic_url?: string | null
          status?: string
          tenant_id: string
          uazapi_instance_id?: string | null
          uazapi_token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_name?: string | null
          last_chats_sync_at?: string | null
          phone_number?: string | null
          profile_name?: string | null
          profile_pic_url?: string | null
          status?: string
          tenant_id?: string
          uazapi_instance_id?: string | null
          uazapi_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_labels: {
        Row: {
          color: string
          company_id: string
          created_at: string
          department_ids: string[]
          distribution_rule: Json
          id: string
          name: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          department_ids?: string[]
          distribution_rule?: Json
          id?: string
          name: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          department_ids?: string[]
          distribution_rule?: Json
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_labels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          ai_generated: boolean | null
          chat_id: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          direction: string
          external_message_id: string | null
          id: string
          lead_id: string | null
          media_download_status: string
          media_mimetype: string | null
          media_url: string | null
          message: string | null
          message_type: string
          metadata: Json | null
          origin: string
          phone: string
          pulse_campaign_id: string | null
          pulse_lead_id: string | null
          pulse_source: string | null
          raw_payload: Json | null
          reactions: Json
          read_at: string | null
          reply_to_message_id: string | null
          sent_at: string | null
          status: string
          transcription: string | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          chat_id?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          external_message_id?: string | null
          id?: string
          lead_id?: string | null
          media_download_status?: string
          media_mimetype?: string | null
          media_url?: string | null
          message?: string | null
          message_type?: string
          metadata?: Json | null
          origin?: string
          phone: string
          pulse_campaign_id?: string | null
          pulse_lead_id?: string | null
          pulse_source?: string | null
          raw_payload?: Json | null
          reactions?: Json
          read_at?: string | null
          reply_to_message_id?: string | null
          sent_at?: string | null
          status?: string
          transcription?: string | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          chat_id?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          external_message_id?: string | null
          id?: string
          lead_id?: string | null
          media_download_status?: string
          media_mimetype?: string | null
          media_url?: string | null
          message?: string | null
          message_type?: string
          metadata?: Json | null
          origin?: string
          phone?: string
          pulse_campaign_id?: string | null
          pulse_lead_id?: string | null
          pulse_source?: string | null
          raw_payload?: Json | null
          reactions?: Json
          read_at?: string | null
          reply_to_message_id?: string | null
          sent_at?: string | null
          status?: string
          transcription?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_presence: {
        Row: {
          contact_id: string
          id: string
          last_updated: string
          presence_type: string
          started_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          id?: string
          last_updated?: string
          presence_type: string
          started_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          contact_id?: string
          id?: string
          last_updated?: string
          presence_type?: string
          started_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_presence_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_presence_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_quick_replies: {
        Row: {
          category: string | null
          company_id: string
          content: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          id: string
          shortcut: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          content: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          id?: string
          shortcut?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          content?: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          id?: string
          shortcut?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_quick_replies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_routing_rules: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          priority: number
          rule_type: string
          rule_value: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          rule_type?: string
          rule_value: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          rule_type?: string
          rule_value?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_routing_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_routing_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          phone_number: string | null
          session_data: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          phone_number?: string | null
          session_data?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          phone_number?: string | null
          session_data?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body: string
          buttons: Json
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          footer: string | null
          header_media_doc_name: string | null
          header_media_url: string | null
          header_text: string | null
          header_type: string
          id: string
          is_favorite: boolean
          language: string
          name: string
          status: string
          tenant_id: string
          updated_at: string
          variable_count: number
        }
        Insert: {
          body?: string
          buttons?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          footer?: string | null
          header_media_doc_name?: string | null
          header_media_url?: string | null
          header_text?: string | null
          header_type?: string
          id?: string
          is_favorite?: boolean
          language?: string
          name: string
          status?: string
          tenant_id: string
          updated_at?: string
          variable_count?: number
        }
        Update: {
          body?: string
          buttons?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          footer?: string | null
          header_media_doc_name?: string | null
          header_media_url?: string | null
          header_text?: string | null
          header_type?: string
          id?: string
          is_favorite?: boolean
          language?: string
          name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          variable_count?: number
        }
        Relationships: []
      }
      whatsapp_webhook_errors: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string | null
          id: string
          payload: Json | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      whatsapp_workspace_config: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_workspace_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_workspace_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_goal_models: {
        Row: {
          created_at: string
          id: string
          regra_calculo: Json | null
          tenant_id: string
          tipo_calculo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          regra_calculo?: Json | null
          tenant_id: string
          tipo_calculo?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          regra_calculo?: Json | null
          tenant_id?: string
          tipo_calculo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_goal_models_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_goal_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_goals: {
        Row: {
          ano: number
          created_at: string
          criado_por: string | null
          id: string
          mes: number
          meta_valor: number
          tenant_id: string
          tipo_meta: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ano: number
          created_at?: string
          criado_por?: string | null
          id?: string
          mes: number
          meta_valor?: number
          tenant_id: string
          tipo_meta?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ano?: number
          created_at?: string
          criado_por?: string | null
          id?: string
          mes?: number
          meta_valor?: number
          tenant_id?: string
          tipo_meta?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_groups: {
        Row: {
          active: boolean
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          position: number
          servidor_id: string
          slug: string | null
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          position?: number
          servidor_id: string
          slug?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          position?: number
          servidor_id?: string
          slug?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_groups_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_kpis: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          origem: string
          posicao: number
          regra: Json | null
          tenant_id: string
          tipo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          origem?: string
          posicao?: number
          regra?: Json | null
          tenant_id: string
          tipo?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          origem?: string
          posicao?: number
          regra?: Json | null
          tenant_id?: string
          tipo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_kpis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_kpis_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          color: string
          created_at: string
          created_by_user_id: string | null
          group_id: string | null
          icon: string
          id: string
          is_default: boolean
          name: string
          servidor_id: string
          sort_order: number
          type: string
          updated_at: string
          won_destination: string | null
          won_target_workspace_id: string | null
          workspace_type: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by_user_id?: string | null
          group_id?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          servidor_id: string
          sort_order?: number
          type?: string
          updated_at?: string
          won_destination?: string | null
          won_target_workspace_id?: string | null
          workspace_type?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by_user_id?: string | null
          group_id?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          servidor_id?: string
          sort_order?: number
          type?: string
          updated_at?: string
          won_destination?: string | null
          won_target_workspace_id?: string | null
          workspace_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "workspace_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      zapi_webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          message_id: string | null
          payload: Json | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          message_id?: string | null
          payload?: Json | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          message_id?: string | null
          payload?: Json | null
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _is_signer_admin: { Args: { _company_id: string }; Returns: boolean }
      accept_proposal_public: {
        Args: {
          p_doc: string
          p_ip: string
          p_name: string
          p_token: string
          p_user_agent: string
        }
        Returns: boolean
      }
      accept_user_invitation_by_token: {
        Args: { p_token: string }
        Returns: boolean
      }
      assume_attendance: {
        Args: {
          p_contact_id: string
          p_timeout_minutes?: number
          p_user_id: string
        }
        Returns: undefined
      }
      auto_release_expired_attendance: { Args: never; Returns: undefined }
      block_expired_trials: { Args: never; Returns: undefined }
      check_cnpj_status: {
        Args: { _cnpj: string }
        Returns: {
          company_status: string
          id: string
          nome_fantasia: string
          razao_social: string
          result_status: string
        }[]
      }
      check_user_limit: { Args: { _tenant_id: string }; Returns: Json }
      cleanup_expired_presence: { Args: never; Returns: undefined }
      clear_presence: {
        Args: { p_contact_id: string; p_user_id: string }
        Returns: undefined
      }
      compute_crm_performance: {
        Args: { _ano: number; _mes: number; _tenant_id: string }
        Returns: {
          conversao: number
          ganhos: number
          perdas: number
          user_id: string
          user_name: string
          valor_total: number
        }[]
      }
      count_active_tenant_users: {
        Args: { _tenant_id: string }
        Returns: number
      }
      count_child_tenants: { Args: { _reseller_id: string }; Returns: number }
      count_queue_items: { Args: { p_department_id: string }; Returns: number }
      create_notification:
        | {
            Args: {
              _link?: string
              _message: string
              _metadata?: Json
              _title: string
              _type?: string
              _user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              _link?: string
              _message: string
              _metadata?: Json
              _servidor_id?: string
              _title: string
              _type?: string
              _user_id: string
            }
            Returns: string
          }
      current_user_can_create_child_tenants: { Args: never; Returns: boolean }
      current_user_can_manage_child_tenants: { Args: never; Returns: boolean }
      current_user_can_reactivate_child_tenants: {
        Args: never
        Returns: boolean
      }
      current_user_can_suspend_child_tenants: { Args: never; Returns: boolean }
      current_user_is_enabled_reseller: { Args: never; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_ad_integration_secrets: {
        Args: { _integration_id: string }
        Returns: {
          google_webhook_key: string
          page_access_token: string
          system_user_token: string
        }[]
      }
      get_call_responder: {
        Args: { p_contact_id: string; p_workspace_id: string }
        Returns: string
      }
      get_client_contract_signers_admin: {
        Args: { _contract_id: string }
        Returns: {
          contract_id: string
          created_at: string
          email: string | null
          id: string
          is_required: boolean
          name: string
          sign_order: number
          signature_address: string | null
          signature_latitude: number | null
          signature_longitude: number | null
          signature_photo_url: string | null
          signed_at: string | null
          signer_document: string | null
          signer_ip: string | null
          signer_type: string
          signing_token: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "client_contract_signers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_client_contract_signers_by_token: {
        Args: { p_token: string }
        Returns: {
          id: string
          name: string
          sign_order: number
          signed_at: string
          signer_type: string
          status: string
        }[]
      }
      get_client_signer_by_token: {
        Args: { p_token: string }
        Returns: {
          contract_id: string
          email: string
          id: string
          is_required: boolean
          name: string
          sign_order: number
          signature_address: string
          signature_latitude: number
          signature_longitude: number
          signature_photo_url: string
          signed_at: string
          signer_document: string
          signer_ip: string
          signer_type: string
          signing_token: string
          status: string
        }[]
      }
      get_collab_invite_token: { Args: { _conv_id: string }; Returns: string }
      get_collab_servidor: { Args: { _conv_id: string }; Returns: string }
      get_company_credentials: {
        Args: { _company_id: string }
        Returns: {
          webhook_token: string
          zapi_client_token: string
          zapi_instance_id: string
          zapi_token: string
        }[]
      }
      get_company_webhook_config: {
        Args: { _company_id: string }
        Returns: {
          zapi_webhook_chat_presence: string
          zapi_webhook_message_status: string
          zapi_webhook_notify_me: boolean
          zapi_webhook_on_connect: string
          zapi_webhook_on_disconnect: string
          zapi_webhook_on_receive: string
          zapi_webhook_on_send: string
        }[]
      }
      get_contract_company_id: {
        Args: { _contract_id: string }
        Returns: string
      }
      get_data_scope: {
        Args: { _permission: string; _user_id: string }
        Returns: string
      }
      get_document_by_signer_token: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          id: string
          nome: string
          pdf_url: string
          status: string
          tipo: string
        }[]
      }
      get_document_signer_by_token: {
        Args: { p_token: string }
        Returns: {
          auth_token: string
          cpf: string
          data_nascimento: string
          document_id: string
          email: string
          id: string
          location_text: string
          nome_completo: string
          obrigatorio: boolean
          ordem: number
          papel: string
          rejected_at: string
          selfie_url: string
          signed_at: string
          status: string
          telefone: string
        }[]
      }
      get_document_signers_admin: {
        Args: { _document_id: string }
        Returns: {
          auth_token: string
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          document_id: string
          email: string | null
          id: string
          ip_address: string | null
          location_lat: number | null
          location_lng: number | null
          location_text: string | null
          nome_completo: string
          obrigatorio: boolean
          ordem: number
          papel: string
          reject_reason: string | null
          rejected_at: string | null
          selfie_url: string | null
          signed_at: string | null
          status: string
          telefone: string | null
          updated_at: string
          user_agent: string | null
          validated_at: string | null
          validation_code: string | null
          validation_code_expires_at: string | null
          viewed_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "document_signers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_document_signers_by_token: {
        Args: { p_token: string }
        Returns: {
          id: string
          nome_completo: string
          ordem: number
          papel: string
          rejected_at: string
          signed_at: string
          status: string
        }[]
      }
      get_drive_file_servidor: { Args: { _file_id: string }; Returns: string }
      get_effective_certificate: {
        Args: { _purpose?: string; _tenant_id: string }
        Returns: {
          ambiente: string
          holder_document: string
          id: string
          is_global: boolean
          password_encrypted: string
          password_iv: string
          storage_path: string
          valid_until: string
        }[]
      }
      get_pdf_contract_servidor: {
        Args: { _contract_id: string }
        Returns: string
      }
      get_pdf_contract_signers_admin: {
        Args: { _contract_id: string }
        Returns: {
          address: string | null
          contract_id: string
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          sign_order: number
          signature_address: string | null
          signature_latitude: number | null
          signature_longitude: number | null
          signature_photo_url: string | null
          signed_at: string | null
          signer_ip: string | null
          signing_token: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "pdf_contract_signers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_pdf_contract_signers_by_token: {
        Args: { p_token: string }
        Returns: {
          id: string
          name: string
          sign_order: number
          signed_at: string
          status: string
        }[]
      }
      get_pdf_signer_by_token: {
        Args: { p_token: string }
        Returns: {
          address: string
          contract_id: string
          cpf_cnpj: string
          email: string
          id: string
          name: string
          phone: string
          sign_order: number
          signature_address: string
          signature_latitude: number
          signature_longitude: number
          signature_photo_url: string
          signed_at: string
          signer_ip: string
          signing_token: string
          status: string
        }[]
      }
      get_profile_company_id: { Args: { _user_id: string }; Returns: string }
      get_proposal_by_public_token: { Args: { p_token: string }; Returns: Json }
      get_public_form_by_slug: {
        Args: { p_slug: string }
        Returns: {
          brand_accent_color: string
          brand_bg_color: string
          brand_logo_url: string
          brand_primary_color: string
          brand_secondary_color: string
          brand_text_color: string
          cta_text: string
          description: string
          fields: Json
          headline: string
          id: string
          name: string
          redirect_url_after_submit: string
          seo_description: string
          seo_title: string
          servidor_id: string
          slug: string
          subheadline: string
          tags: string[]
          tenant_name: string
          thank_you_message: string
          workspace_id: string
        }[]
      }
      get_public_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          departments: Json
          name: string
          status: string
          user_id: string
        }[]
      }
      get_tenant_fintech_webhook_token: {
        Args: { _provider?: string; _tenant_id: string }
        Returns: string
      }
      get_tenant_members: {
        Args: { _tenant_id: string }
        Returns: {
          avatar_url: string
          name: string
          user_id: string
        }[]
      }
      get_tenant_setup_by_token: {
        Args: { p_token: string }
        Returns: {
          bairro: string
          brand_accent_color: string
          brand_bg_color: string
          brand_primary_color: string
          brand_secondary_color: string
          brand_text_color: string
          cep: string
          cidade: string
          cnpj: string
          complemento: string
          email: string
          endereco: string
          estado: string
          id: string
          nome_fantasia: string
          numero: string
          razao_social: string
          responsavel: string
          status: string
          telefone: string
        }[]
      }
      get_tenant_type: { Args: { _tenant_id: string }; Returns: string }
      get_tenant_user_limit: { Args: { _tenant_id: string }; Returns: number }
      get_today_birthdays: {
        Args: { _company_id?: string }
        Returns: {
          avatar_url: string
          birth_date: string
          name: string
          user_id: string
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          company_id: string
          expires_at: string
          id: string
          invitee_birth_date: string
          invitee_cpf: string
          invitee_email: string
          invitee_name: string
          invitee_whatsapp: string
          role: string
          status: string
          trial_expires_at: string
        }[]
      }
      get_whatsapp_instance_token: {
        Args: { _integration_id: string }
        Returns: string
      }
      has_active_paddle_subscription: {
        Args: { check_env?: string; tenant_uuid: string }
        Returns: boolean
      }
      has_company_webhook_token: {
        Args: { _company_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_master_tenant: {
        Args: { _company_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_collab_admin: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      is_collab_member: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      is_reseller_of: {
        Args: { _child_id: string; _reseller_id: string }
        Returns: boolean
      }
      is_user_trial_expired: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _details?: Json
          _servidor_id?: string
          _target_id?: string
          _target_type: string
          _user_id: string
          _user_name: string
        }
        Returns: undefined
      }
      log_platform_admin_access: {
        Args: {
          _action: string
          _details?: Json
          _target_id?: string
          _target_type?: string
          _tenant_id: string
        }
        Returns: string
      }
      log_system_error: {
        Args: {
          _action: string
          _message: string
          _metadata?: Json
          _module: string
          _severity?: string
          _stack_trace?: string
          _tenant_id?: string
          _user_id?: string
        }
        Returns: string
      }
      log_tenant_security_event: {
        Args: { _action: string; _details?: Json; _target_id: string }
        Returns: undefined
      }
      lookup_servidor_by_cnpj: {
        Args: { _cnpj: string }
        Returns: {
          id: string
          nome_fantasia: string
          razao_social: string
          status: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_proposal_control_code: {
        Args: { _servidor_id: string }
        Returns: string
      }
      next_tenant_contract_code: {
        Args: { _servidor_id: string }
        Returns: string
      }
      pdf_contract_has_signer_token: {
        Args: { _contract_id: string }
        Returns: boolean
      }
      promote_sdr_lead: {
        Args: { _sdr_lead_id: string; _target_workspace_id: string }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalc_subscription_totals: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      record_proposal_public_view: {
        Args: { p_ip: string; p_token: string; p_user_agent: string }
        Returns: undefined
      }
      register_incoming_whatsapp_call: {
        Args: {
          p_caller_avatar?: string
          p_caller_name?: string
          p_company_id: string
          p_contact_id: string
          p_external_call_id?: string
          p_phone: string
          p_workspace_id: string
        }
        Returns: string
      }
      register_whatsapp_call: {
        Args: {
          p_call_type: string
          p_company_id: string
          p_contact_id: string
          p_name: string
          p_phone: string
          p_uazapi_call_id?: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: string
      }
      reject_proposal_public: {
        Args: {
          p_ip: string
          p_reason: string
          p_token: string
          p_user_agent: string
        }
        Returns: boolean
      }
      release_attendance: { Args: { p_contact_id: string }; Returns: undefined }
      reseller_can_add_child: {
        Args: { _reseller_id: string }
        Returns: boolean
      }
      resolve_tenant_by_webhook_token: {
        Args: { p_token: string }
        Returns: string
      }
      route_by_department: {
        Args: {
          p_contact_id: string
          p_department_id: string
          p_selected_option: string
          p_tenant_id: string
        }
        Returns: string
      }
      submit_tenant_setup_by_token: {
        Args: { p_payload: Json; p_token: string }
        Returns: boolean
      }
      sync_master_client_user_count: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      update_presence: {
        Args: {
          p_contact_id: string
          p_presence_type: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_whatsapp_call_status: {
        Args: {
          p_call_id: string
          p_duration_seconds?: number
          p_rejection_reason?: string
          p_status: string
        }
        Returns: undefined
      }
      user_can_access_workspace: {
        Args: { _permission?: string; _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      user_has_tenant_access: {
        Args: { _tenant: string; _user: string }
        Returns: boolean
      }
      user_is_reseller_of: {
        Args: { _child_tenant_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "operador"
        | "leitura"
        | "ceo"
        | "administrativo"
        | "financeiro"
        | "comercial"
        | "master"
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
      app_role: [
        "admin",
        "operador",
        "leitura",
        "ceo",
        "administrativo",
        "financeiro",
        "comercial",
        "master",
      ],
    },
  },
} as const
