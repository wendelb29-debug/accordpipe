REVOKE ALL ON public.companies FROM anon, PUBLIC;
REVOKE ALL ON public.user_tenants FROM anon, PUBLIC;
REVOKE ALL ON public.tenant_setup_requests FROM anon, PUBLIC;
REVOKE ALL ON public.master_tenant_clients FROM anon, PUBLIC;
REVOKE ALL ON public.master_billing_history FROM anon, PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tenants TO authenticated;
GRANT ALL ON public.user_tenants TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_setup_requests TO authenticated;
GRANT ALL ON public.tenant_setup_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_tenant_clients TO authenticated;
GRANT ALL ON public.master_tenant_clients TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_billing_history TO authenticated;
GRANT ALL ON public.master_billing_history TO service_role;

GRANT EXECUTE ON FUNCTION public.get_tenant_setup_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_tenant_setup_by_token(text, jsonb) TO anon, authenticated, service_role;