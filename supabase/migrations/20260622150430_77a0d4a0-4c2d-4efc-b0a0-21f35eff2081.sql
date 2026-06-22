
-- Remove blanket SELECT on companies and re-grant only non-sensitive columns
REVOKE SELECT ON public.companies FROM authenticated;

GRANT SELECT (
  id, cnpj, razao_social, nome_fantasia, responsavel, email, telefone, status,
  cep, endereco, numero, complemento, bairro, cidade, estado,
  created_by, created_at, updated_at, servidor_id,
  is_trial, trial_start, trial_expires_at, trial_extensions,
  brand_logo_url, brand_logo_path, brand_primary_color, brand_secondary_color,
  brand_accent_color, brand_bg_color, brand_text_color,
  doc_primary_color, doc_secondary_color, doc_accent_color, doc_bg_color, doc_text_color,
  tenant_type, parent_tenant_id, created_by_tenant_id,
  can_create_tenants, can_manage_child_tenants, max_child_tenants,
  is_reseller, reseller_panel_enabled, can_create_child_tenants, can_edit_child_tenants,
  can_suspend_child_tenants, can_reactivate_child_tenants, can_view_child_billing,
  can_create_test_tenants
) ON public.companies TO authenticated;

-- Secure RPC for reading webhook config (admin/CEO of company or master)
CREATE OR REPLACE FUNCTION public.get_company_webhook_config(_company_id uuid)
RETURNS TABLE(
  zapi_webhook_on_send text,
  zapi_webhook_on_disconnect text,
  zapi_webhook_on_receive text,
  zapi_webhook_chat_presence text,
  zapi_webhook_message_status text,
  zapi_webhook_on_connect text,
  zapi_webhook_notify_me boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.zapi_webhook_on_send, c.zapi_webhook_on_disconnect, c.zapi_webhook_on_receive,
         c.zapi_webhook_chat_presence, c.zapi_webhook_message_status, c.zapi_webhook_on_connect,
         c.zapi_webhook_notify_me
  FROM public.companies c
  WHERE c.id = _company_id
    AND (
      public.is_master(auth.uid())
      OR (
        c.id = public.get_user_company_id(auth.uid())
        AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_company_webhook_config(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_webhook_config(uuid) TO authenticated;
