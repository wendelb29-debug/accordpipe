-- 1) Companies: keep sensitive integration credentials server-only (read AND write)
REVOKE SELECT (zapi_token, zapi_client_token, webhook_token, zapi_instance_id) ON public.companies FROM authenticated;
REVOKE SELECT (zapi_token, zapi_client_token, webhook_token, zapi_instance_id) ON public.companies FROM anon;
REVOKE UPDATE (zapi_token, zapi_client_token, webhook_token, zapi_instance_id) ON public.companies FROM authenticated;
REVOKE UPDATE (zapi_token, zapi_client_token, webhook_token, zapi_instance_id) ON public.companies FROM anon;
REVOKE INSERT (zapi_token, zapi_client_token, webhook_token, zapi_instance_id) ON public.companies FROM authenticated;
REVOKE INSERT (zapi_token, zapi_client_token, webhook_token, zapi_instance_id) ON public.companies FROM anon;
GRANT ALL ON public.companies TO service_role;

-- 2) crm_leads: remove the blanket tenant-wide SELECT policy that bypassed assignment scoping
DROP POLICY IF EXISTS "Users can view leads for their servidor" ON public.crm_leads;