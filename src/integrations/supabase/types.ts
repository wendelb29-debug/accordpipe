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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          servidor_id: string | null
          target_id: string | null
          target_type: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          servidor_id?: string | null
          target_id?: string | null
          target_type: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          servidor_id?: string | null
          target_id?: string | null
          target_type?: string
          user_id?: string
          user_name?: string | null
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
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          created_at: string
          created_by: string | null
          doc_accent_color: string | null
          doc_bg_color: string | null
          doc_primary_color: string | null
          doc_secondary_color: string | null
          doc_text_color: string | null
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
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          doc_accent_color?: string | null
          doc_bg_color?: string | null
          doc_primary_color?: string | null
          doc_secondary_color?: string | null
          doc_text_color?: string | null
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
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          doc_accent_color?: string | null
          doc_bg_color?: string | null
          doc_primary_color?: string | null
          doc_secondary_color?: string | null
          doc_text_color?: string | null
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
          description: string | null
          fields: Json
          id: string
          is_active: boolean
          name: string
          servidor_id: string
          tags: string[] | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name: string
          servidor_id: string
          tags?: string[] | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name?: string
          servidor_id?: string
          tags?: string[] | null
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
          lead_status: string
          lost_reason: string | null
          notes: string | null
          numero: string | null
          phone: string | null
          servidor_id: string
          source: string
          stage: string
          stage_entered_at: string
          tags: string[] | null
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
          lead_status?: string
          lost_reason?: string | null
          notes?: string | null
          numero?: string | null
          phone?: string | null
          servidor_id: string
          source?: string
          stage?: string
          stage_entered_at?: string
          tags?: string[] | null
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
          lead_status?: string
          lost_reason?: string | null
          notes?: string | null
          numero?: string | null
          phone?: string | null
          servidor_id?: string
          source?: string
          stage?: string
          stage_entered_at?: string
          tags?: string[] | null
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
          last_assigned_at: string | null
          name: string
          preferred_language: string
          signature_completed: boolean
          status: string
          tags: string[] | null
          theme: string
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
          last_assigned_at?: string | null
          name: string
          preferred_language?: string
          signature_completed?: boolean
          status?: string
          tags?: string[] | null
          theme?: string
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
          last_assigned_at?: string | null
          name?: string
          preferred_language?: string
          signature_completed?: boolean
          status?: string
          tags?: string[] | null
          theme?: string
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
      proposals: {
        Row: {
          approved_at: string | null
          approved_by_name: string | null
          created_at: string
          created_by_name: string | null
          created_by_user_id: string | null
          descricao: string | null
          id: string
          item_id: string | null
          lead_id: string
          pdf_url: string | null
          servidor_id: string
          status: string
          titulo: string
          updated_at: string
          valor: number
        }
        Insert: {
          approved_at?: string | null
          approved_by_name?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          descricao?: string | null
          id?: string
          item_id?: string | null
          lead_id: string
          pdf_url?: string | null
          servidor_id: string
          status?: string
          titulo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          approved_at?: string | null
          approved_by_name?: string | null
          created_at?: string
          created_by_name?: string | null
          created_by_user_id?: string | null
          descricao?: string | null
          id?: string
          item_id?: string | null
          lead_id?: string
          pdf_url?: string | null
          servidor_id?: string
          status?: string
          titulo?: string
          updated_at?: string
          valor?: number
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
      whatsapp_contacts: {
        Row: {
          assigned_to: string | null
          avatar_url: string | null
          company_id: string
          conversation_status: string
          created_at: string
          id: string
          labels: string[] | null
          last_message: string | null
          last_message_at: string | null
          lead_id: string | null
          name: string
          notes: string | null
          phone: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          avatar_url?: string | null
          company_id: string
          conversation_status?: string
          created_at?: string
          id?: string
          labels?: string[] | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          avatar_url?: string | null
          company_id?: string
          conversation_status?: string
          created_at?: string
          id?: string
          labels?: string[] | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          name?: string
          notes?: string | null
          phone?: string
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
      get_pdf_contract_servidor: {
        Args: { _contract_id: string }
        Returns: string
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_master: { Args: { _user_id: string }; Returns: boolean }
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
      lookup_servidor_by_cnpj: {
        Args: { _cnpj: string }
        Returns: {
          id: string
          nome_fantasia: string
          razao_social: string
          status: string
        }[]
      }
      next_tenant_contract_code: {
        Args: { _servidor_id: string }
        Returns: string
      }
      pdf_contract_has_signer_token: {
        Args: { _contract_id: string }
        Returns: boolean
      }
      resolve_tenant_by_webhook_token: {
        Args: { p_token: string }
        Returns: string
      }
      user_can_access_workspace: {
        Args: { _permission?: string; _user_id: string; _workspace_id: string }
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
