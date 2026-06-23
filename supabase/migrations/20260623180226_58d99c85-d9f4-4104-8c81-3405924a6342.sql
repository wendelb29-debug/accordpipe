-- Restrict access to WhatsApp/webhook secret columns on companies.
-- Authenticated users can still read all non-secret columns; secrets are
-- only accessible via the existing SECURITY DEFINER RPCs
-- (get_company_credentials / get_whatsapp_instance_token) and service_role.

REVOKE SELECT ON public.companies FROM authenticated;
REVOKE SELECT ON public.companies FROM anon;

GRANT SELECT (
  id, cnpj, razao_social, nome_fantasia, responsavel, email, telefone, status,
  cep, endereco, numero, complemento, bairro, cidade, estado, created_by,
  created_at, updated_at, servidor_id, is_trial, trial_start, trial_expires_at,
  trial_extensions, zapi_instance_id, zapi_phone, brand_logo_url, brand_logo_path,
  brand_primary_color, brand_secondary_color, brand_accent_color, brand_bg_color,
  brand_text_color, zapi_webhook_on_send, zapi_webhook_on_disconnect,
  zapi_webhook_on_receive, zapi_webhook_chat_presence, zapi_webhook_message_status,
  zapi_webhook_on_connect, zapi_webhook_notify_me, doc_primary_color,
  doc_secondary_color, doc_accent_color, doc_bg_color, doc_text_color, tenant_type,
  parent_tenant_id, created_by_tenant_id, can_create_tenants, can_manage_child_tenants,
  max_child_tenants, is_reseller, reseller_panel_enabled, can_create_child_tenants,
  can_edit_child_tenants, can_suspend_child_tenants, can_reactivate_child_tenants,
  can_view_child_billing, can_create_test_tenants
) ON public.companies TO authenticated;

-- service_role keeps full access for edge functions / admin code
GRANT ALL ON public.companies TO service_role;
