-- Revoke SELECT on sensitive credential columns from client roles.
-- Access continues via SECURITY DEFINER RPCs (has_company_webhook_token,
-- get_tenant_fintech_webhook_token, etc). service_role retains full access.

REVOKE SELECT (zapi_token, zapi_client_token, webhook_token)
  ON public.companies FROM anon, authenticated;

REVOKE SELECT (api_key_encrypted, client_secret_encrypted, webhook_secret_encrypted, origin_key_encrypted)
  ON public.fintech_integrations FROM anon, authenticated;

REVOKE SELECT (api_key_encrypted)
  ON public.tenant_fintech_integrations FROM anon, authenticated;