
REVOKE EXECUTE ON FUNCTION public.is_collab_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_collab_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_collab_servidor(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.collab_update_last_message() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_collab_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_collab_admin(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_collab_servidor(uuid) TO authenticated, service_role;
