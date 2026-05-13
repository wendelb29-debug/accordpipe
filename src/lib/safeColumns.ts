// Centralized safe (non-credential) column lists for tables that have
// per-column SELECT restrictions enforced by Postgres. Always use these
// instead of "*" when reading from these tables. Sensitive columns are
// fetched via SECURITY DEFINER RPCs (see /supabase/migrations).

export const COMPANY_SAFE_COLUMNS = [
  "id", "cnpj", "razao_social", "nome_fantasia", "responsavel", "email", "telefone", "status",
  "cep", "endereco", "numero", "complemento", "bairro", "cidade", "estado",
  "created_by", "created_at", "updated_at", "servidor_id",
  "is_trial", "trial_start", "trial_expires_at", "trial_extensions",
  "zapi_instance_id", "zapi_phone",
  "brand_logo_url", "brand_logo_path", "brand_primary_color", "brand_secondary_color",
  "brand_accent_color", "brand_bg_color", "brand_text_color",
  "zapi_webhook_on_send", "zapi_webhook_on_disconnect", "zapi_webhook_on_receive",
  "zapi_webhook_chat_presence", "zapi_webhook_message_status", "zapi_webhook_on_connect",
  "zapi_webhook_notify_me",
  "doc_primary_color", "doc_secondary_color", "doc_accent_color", "doc_bg_color", "doc_text_color",
  "tenant_type", "parent_tenant_id", "created_by_tenant_id",
  "can_create_tenants", "can_manage_child_tenants", "max_child_tenants",
  "is_reseller", "reseller_panel_enabled", "can_create_child_tenants", "can_edit_child_tenants",
  "can_suspend_child_tenants", "can_reactivate_child_tenants", "can_view_child_billing",
  "can_create_test_tenants",
].join(", ");

export const WHATSAPP_INTEGRATION_SAFE_COLUMNS = [
  "id", "tenant_id", "provider_type", "server_url", "instance_name", "instance_id",
  "is_active", "last_tested_at", "last_test_status", "last_test_message",
  "updated_by", "created_at", "updated_at",
  "webhook_enabled", "webhook_url", "webhook_url_final",
  "add_events_in_url", "add_message_types_in_url",
  "listen_events", "exclude_events", "publish_status",
  "last_webhook_test_at", "last_webhook_test_status",
  "connected_phone", "connection_status", "last_seen_at", "last_sync_at",
  "provider_metadata",
].join(", ");
