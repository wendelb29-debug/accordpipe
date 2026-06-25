CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  status text,
  created_at timestamptz,
  departments jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_company uuid;
  v_target_company uuid;
BEGIN
  IF v_caller IS NULL OR p_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT company_id INTO v_caller_company FROM public.profiles WHERE profiles.user_id = v_caller LIMIT 1;
  SELECT company_id INTO v_target_company FROM public.profiles WHERE profiles.user_id = p_user_id LIMIT 1;

  IF v_caller_company IS NULL OR v_target_company IS NULL OR v_caller_company <> v_target_company THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.name,
    p.avatar_url,
    p.status,
    p.created_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', td.name, 'color', td.color) ORDER BY ud.priority NULLS LAST)
      FROM public.user_departments ud
      JOIN public.tenant_departments td ON td.id = ud.department_id
      WHERE ud.user_id = p.user_id
        AND ud.is_active = true
        AND td.tenant_id = v_caller_company
    ), '[]'::jsonb) AS departments
  FROM public.profiles p
  WHERE p.user_id = p_user_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;