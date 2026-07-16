
-- 1) user_roles: block self role changes; block non-masters from granting master/ceo
CREATE POLICY "Block self role assignment"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (user_id <> auth.uid() OR public.is_master(auth.uid()));

CREATE POLICY "Only master can grant master or ceo"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (role NOT IN ('master','ceo') OR public.is_master(auth.uid()));

CREATE POLICY "Block self role update"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (user_id <> auth.uid() OR public.is_master(auth.uid()))
WITH CHECK (user_id <> auth.uid() OR public.is_master(auth.uid()));

CREATE POLICY "Only master can update to master or ceo"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (role NOT IN ('master','ceo') OR public.is_master(auth.uid()));

-- 2) certificate_usage_logs: scope inserts to caller tenant
DROP POLICY IF EXISTS "Authenticated insert cert logs" ON public.certificate_usage_logs;

CREATE POLICY "Users insert cert logs for own tenant"
ON public.certificate_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_master(auth.uid())
  OR tenant_id = public.get_user_company_id(auth.uid())
);

-- 3) role_default_permissions: remove blanket authenticated read
DROP POLICY IF EXISTS "Authenticated can view role_default_permissions" ON public.role_default_permissions;
