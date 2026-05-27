
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(_user uuid, _tenant uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user AND company_id = _tenant
  ) OR EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = _user AND tenant_id = _tenant AND status = 'active'
  );
$$;

DROP POLICY IF EXISTS "Tenant users create conversations" ON public.collab_conversations;
CREATE POLICY "Tenant users create conversations"
ON public.collab_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_tenant_access(auth.uid(), servidor_id)
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Members see conversations" ON public.collab_conversations;
CREATE POLICY "Members see conversations"
ON public.collab_conversations
FOR SELECT
TO authenticated
USING (
  public.user_has_tenant_access(auth.uid(), servidor_id)
  AND (kind = 'channel' OR is_collab_member(id, auth.uid()))
);
