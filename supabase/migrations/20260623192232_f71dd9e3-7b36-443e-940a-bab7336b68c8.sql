-- Revoke column-level SELECT on WhatsApp/Z-API credentials and webhook secret
-- from the broad authenticated role. Sensitive values must only be reachable
-- via the SECURITY DEFINER RPCs get_company_credentials / get_company_webhook_config
-- / has_company_webhook_token, which already enforce admin/CEO/master checks.
REVOKE SELECT (zapi_token, zapi_client_token, webhook_token) ON public.companies FROM authenticated;
REVOKE SELECT (zapi_token, zapi_client_token, webhook_token) ON public.companies FROM anon;
-- service_role keeps full access for edge functions/admin code (GRANT ALL is implicit on owner role).
GRANT SELECT (zapi_token, zapi_client_token, webhook_token) ON public.companies TO service_role;