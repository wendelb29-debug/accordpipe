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

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_reseller_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_create_child_tenants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_manage_child_tenants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_suspend_child_tenants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_master_client_user_count(uuid) TO authenticated;