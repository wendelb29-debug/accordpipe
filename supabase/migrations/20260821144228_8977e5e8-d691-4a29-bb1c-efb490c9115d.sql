
-- Fix Function Search Path Mutable for audit_closer_settings_changes
ALTER FUNCTION public.audit_closer_settings_changes() SET search_path = public;

-- Revoke public execution of the trigger function
REVOKE EXECUTE ON FUNCTION public.audit_closer_settings_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_closer_settings_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_closer_settings_changes() FROM anon;

-- Grant execute to service_role (usually enough for triggers)
GRANT EXECUTE ON FUNCTION public.audit_closer_settings_changes() TO service_role;
GRANT EXECUTE ON FUNCTION public.audit_closer_settings_changes() TO postgres;
