
-- Revoke SELECT on sensitive credential columns from authenticated role.
-- Service role (used by edge functions) retains full access.

REVOKE SELECT (page_access_token, system_user_token) ON public.ad_integrations FROM authenticated;
REVOKE SELECT (page_access_token, system_user_token) ON public.ad_integrations FROM anon;

REVOKE SELECT (zapi_token, zapi_client_token) ON public.company_api_credentials FROM authenticated;
REVOKE SELECT (zapi_token, zapi_client_token) ON public.company_api_credentials FROM anon;

REVOKE SELECT (oauth_tokens) ON public.cloud_drive_accounts FROM authenticated;
REVOKE SELECT (oauth_tokens) ON public.cloud_drive_accounts FROM anon;

REVOKE SELECT (access_token, refresh_token) ON public.marketing_email_connections FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.marketing_email_connections FROM anon;

REVOKE SELECT (webhook_auth_token) ON public.tenant_fintech_integrations FROM authenticated;
REVOKE SELECT (webhook_auth_token) ON public.tenant_fintech_integrations FROM anon;

-- SECURITY DEFINER RPC: only tenant Master/CEO/Admin can fetch the fintech webhook auth token.
CREATE OR REPLACE FUNCTION public.get_tenant_fintech_webhook_token(_tenant_id uuid, _provider text DEFAULT 'asaas')
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.webhook_auth_token
  FROM public.tenant_fintech_integrations t
  WHERE t.tenant_id = _tenant_id
    AND t.provider = _provider
    AND (
      public.is_master(auth.uid())
      OR (
        t.tenant_id = public.get_user_company_id(auth.uid())
        AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_fintech_webhook_token(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_tenant_fintech_webhook_token(uuid, text) TO authenticated;
