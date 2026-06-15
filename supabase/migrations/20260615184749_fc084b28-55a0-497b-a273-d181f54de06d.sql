
CREATE OR REPLACE FUNCTION public.get_tenant_members(_tenant_id uuid)
RETURNS TABLE(user_id uuid, name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, COALESCE(p.name, p.email, 'Sem nome') AS name, p.avatar_url
  FROM public.profiles p
  WHERE p.is_active = true
    AND (
      p.company_id = _tenant_id
      OR EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = p.user_id
          AND ut.tenant_id = _tenant_id
          AND ut.status = 'ativo'
      )
    )
    AND public.user_has_tenant_access(auth.uid(), _tenant_id)
  ORDER BY name;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_members(uuid) TO authenticated;
