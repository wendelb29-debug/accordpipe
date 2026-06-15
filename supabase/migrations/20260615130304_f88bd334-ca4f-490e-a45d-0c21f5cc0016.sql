
-- 1. audit_logs: replace overly broad "Gestao" policy with tenant-scoped one
DROP POLICY IF EXISTS "Gestao can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "CEO can view own tenant audit logs" ON public.audit_logs;

CREATE POLICY "Admins and CEOs view own tenant audit logs"
ON public.audit_logs
FOR SELECT
USING (
  servidor_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
  )
);

-- 2. user_signatures: tenant-scope admin access
DROP POLICY IF EXISTS "Users can view own signature" ON public.user_signatures;

CREATE POLICY "Users can view own signature"
ON public.user_signatures
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_master(auth.uid())
  OR (
    public.is_admin(auth.uid())
    AND public.get_profile_company_id(user_id) = public.get_user_company_id(auth.uid())
  )
);

-- 3. collab_reactions: enforce membership on INSERT
DROP POLICY IF EXISTS "Users add own reactions" ON public.collab_reactions;

CREATE POLICY "Users add own reactions"
ON public.collab_reactions
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.collab_messages m
    WHERE m.id = collab_reactions.message_id
      AND public.is_collab_member(m.conversation_id, auth.uid())
  )
);

-- 4. tenant_fintech_integrations: gate writes by admin/ceo/master role
DROP POLICY IF EXISTS "Users can insert own tenant integrations" ON public.tenant_fintech_integrations;
DROP POLICY IF EXISTS "Users can update own tenant integrations" ON public.tenant_fintech_integrations;
DROP POLICY IF EXISTS "Users can delete own tenant integrations" ON public.tenant_fintech_integrations;

CREATE POLICY "Admins manage tenant fintech integrations insert"
ON public.tenant_fintech_integrations
FOR INSERT
WITH CHECK (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Admins manage tenant fintech integrations update"
ON public.tenant_fintech_integrations
FOR UPDATE
USING (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Admins manage tenant fintech integrations delete"
ON public.tenant_fintech_integrations
FOR DELETE
USING (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
