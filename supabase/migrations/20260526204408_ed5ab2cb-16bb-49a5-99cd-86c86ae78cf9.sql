REVOKE EXECUTE ON FUNCTION public.get_effective_certificate(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_effective_certificate(uuid, text) TO service_role;