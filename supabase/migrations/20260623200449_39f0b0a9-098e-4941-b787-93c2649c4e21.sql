REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_master(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_company_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_is_reseller_of(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_can_create_child_tenants() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_can_manage_child_tenants() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_can_suspend_child_tenants() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_master_client_user_count(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_master(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_is_reseller_of(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_create_child_tenants() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_manage_child_tenants() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_suspend_child_tenants() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_master_client_user_count(uuid) TO authenticated, service_role;