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
        }
        Relationships: [
          {
            foreignKeyName: "crm_forms_servidor_id_fkey"
            columns: ["servidor_id"]
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
          created_at: string
          created_by: string | null
          id: string
          name: string
          servidor_id: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          servidor_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
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
      role_default_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
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
      user_custom_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: []
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
          icon: string
          id: string
          is_default: boolean
          name: string
          servidor_id: string
          type: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by_user_id?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          servidor_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by_user_id?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          servidor_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
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
      lookup_servidor_by_cnpj: {
        Args: { _cnpj: string }
        Returns: {
          id: string
          nome_fantasia: string
          razao_social: string
          status: string
        }[]
      }
      pdf_contract_has_signer_token: {
        Args: { _contract_id: string }
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
      ],
    },
  },
} as const
