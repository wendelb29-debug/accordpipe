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
      companies: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          is_trial: boolean
          nome_fantasia: string | null
          numero: string | null
          razao_social: string
          responsavel: string | null
          servidor_id: string | null
          status: string
          telefone: string | null
          trial_expires_at: string | null
          trial_extensions: number
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_trial?: boolean
          nome_fantasia?: string | null
          numero?: string | null
          razao_social: string
          responsavel?: string | null
          servidor_id?: string | null
          status?: string
          telefone?: string | null
          trial_expires_at?: string | null
          trial_extensions?: number
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_trial?: boolean
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string
          responsavel?: string | null
          servidor_id?: string | null
          status?: string
          telefone?: string | null
          trial_expires_at?: string | null
          trial_extensions?: number
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          foro: string | null
          id: string
          link_expires_at: string | null
          matriz_cnpj: string | null
          matriz_endereco: string | null
          matriz_nome: string | null
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
        }
        Insert: {
          code: string
          company_id: string
          contract_content?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          foro?: string | null
          id?: string
          link_expires_at?: string | null
          matriz_cnpj?: string | null
          matriz_endereco?: string | null
          matriz_nome?: string | null
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
        }
        Update: {
          code?: string
          company_id?: string
          contract_content?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          foro?: string | null
          id?: string
          link_expires_at?: string | null
          matriz_cnpj?: string | null
          matriz_endereco?: string | null
          matriz_nome?: string | null
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
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_activities: {
        Row: {
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          servidor_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          servidor_id: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          servidor_id?: string
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
          cidade: string | null
          company_id: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          email: string | null
          estado: string | null
          forecast_date: string | null
          id: string
          lead_status: string
          lost_reason: string | null
          notes: string | null
          phone: string | null
          servidor_id: string
          source: string
          stage: string
          stage_entered_at: string
          updated_at: string
          value_mrr: number
          value_ps: number
        }
        Insert: {
          cidade?: string | null
          company_id?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          email?: string | null
          estado?: string | null
          forecast_date?: string | null
          id?: string
          lead_status?: string
          lost_reason?: string | null
          notes?: string | null
          phone?: string | null
          servidor_id: string
          source?: string
          stage?: string
          stage_entered_at?: string
          updated_at?: string
          value_mrr?: number
          value_ps?: number
        }
        Update: {
          cidade?: string | null
          company_id?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          email?: string | null
          estado?: string | null
          forecast_date?: string | null
          id?: string
          lead_status?: string
          lost_reason?: string | null
          notes?: string | null
          phone?: string | null
          servidor_id?: string
          source?: string
          stage?: string
          stage_entered_at?: string
          updated_at?: string
          value_mrr?: number
          value_ps?: number
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
            foreignKeyName: "crm_leads_servidor_id_fkey"
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
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
          title?: string
          type?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_master: boolean
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          is_master?: boolean
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_master?: boolean
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
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
      whatsapp_contacts: {
        Row: {
          assigned_to: string | null
          avatar_url: string | null
          company_id: string
          created_at: string
          id: string
          labels: string[] | null
          last_message: string | null
          last_message_at: string | null
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          avatar_url?: string | null
          company_id: string
          created_at?: string
          id?: string
          labels?: string[] | null
          last_message?: string | null
          last_message_at?: string | null
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          id?: string
          labels?: string[] | null
          last_message?: string | null
          last_message_at?: string | null
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_labels: {
        Row: {
          color: string
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
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
          company_id: string
          contact_id: string
          created_at: string
          direction: string
          id: string
          media_url: string | null
          message: string
          message_type: string
          metadata: Json | null
          phone: string
          status: string
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          direction?: string
          id?: string
          media_url?: string | null
          message: string
          message_type?: string
          metadata?: Json | null
          phone: string
          status?: string
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          direction?: string
          id?: string
          media_url?: string | null
          message?: string
          message_type?: string
          metadata?: Json | null
          phone?: string
          status?: string
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
      create_notification: {
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
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      lookup_servidor_by_cnpj: {
        Args: { _cnpj: string }
        Returns: {
          id: string
          nome_fantasia: string
          razao_social: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "operador" | "leitura" | "ceo"
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
      app_role: ["admin", "operador", "leitura", "ceo"],
    },
  },
} as const
