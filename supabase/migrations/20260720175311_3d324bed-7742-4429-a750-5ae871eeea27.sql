
-- 1) Remove broad tenant-wide SELECT on Asaas customer/payment PII
DROP POLICY IF EXISTS "Users can view own tenant asaas customers" ON public.tenant_asaas_customers;
DROP POLICY IF EXISTS "Users can view own tenant asaas payments" ON public.tenant_asaas_payments;

-- 2) Restrict access to sensitive integration credential columns on companies
REVOKE SELECT (
  zapi_token,
  zapi_client_token,
  zapi_webhook_on_send,
  zapi_webhook_on_disconnect,
  zapi_webhook_on_receive,
  zapi_webhook_chat_presence,
  zapi_webhook_message_status,
  zapi_webhook_on_connect,
  zapi_webhook_notify_me,
  webhook_token
) ON public.companies FROM authenticated, anon;

-- Secure RPC for privileged roles to read credentials when needed
CREATE OR REPLACE FUNCTION public.get_company_integration_credentials(_company_id uuid)
RETURNS TABLE (
  zapi_instance_id text,
  zapi_token text,
  zapi_client_token text,
  zapi_phone text,
  zapi_webhook_on_send text,
  zapi_webhook_on_disconnect text,
  zapi_webhook_on_receive text,
  zapi_webhook_chat_presence text,
  zapi_webhook_message_status text,
  zapi_webhook_on_connect text,
  zapi_webhook_notify_me text,
  webhook_token text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_master(auth.uid())
    OR (
      (_company_id = public.get_user_company_id(auth.uid()))
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'ceo'::app_role)
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: admin/ceo/master role required';
  END IF;

  RETURN QUERY
  SELECT
    c.zapi_instance_id,
    c.zapi_token,
    c.zapi_client_token,
    c.zapi_phone,
    c.zapi_webhook_on_send,
    c.zapi_webhook_on_disconnect,
    c.zapi_webhook_on_receive,
    c.zapi_webhook_chat_presence,
    c.zapi_webhook_message_status,
    c.zapi_webhook_on_connect,
    c.zapi_webhook_notify_me,
    c.webhook_token
  FROM public.companies c
  WHERE c.id = _company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_integration_credentials(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_integration_credentials(uuid) TO authenticated, service_role;
