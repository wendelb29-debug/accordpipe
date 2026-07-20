
-- 1) Prevent privilege escalation via is_master on profiles INSERT/UPDATE
DROP POLICY IF EXISTS "Admins can insert profiles in their company" ON public.profiles;
CREATE POLICY "Admins can insert profiles in their company"
ON public.profiles
FOR INSERT
WITH CHECK (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
    AND company_id = get_user_company_id(auth.uid())
    AND is_master = false
  )
);

DROP POLICY IF EXISTS "Resellers can insert child tenant profiles" ON public.profiles;
CREATE POLICY "Resellers can insert child tenant profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  user_is_reseller_of(company_id)
  AND has_permission(auth.uid(), 'manage_child_tenant_users'::text)
  AND is_master = false
);

DROP POLICY IF EXISTS "Resellers can update child tenant profiles" ON public.profiles;
CREATE POLICY "Resellers can update child tenant profiles"
ON public.profiles
FOR UPDATE
USING (
  user_is_reseller_of(company_id)
  AND has_permission(auth.uid(), 'manage_child_tenant_users'::text)
)
WITH CHECK (
  user_is_reseller_of(company_id)
  AND has_permission(auth.uid(), 'manage_child_tenant_users'::text)
  AND is_master = false
);

-- 2) Restrict system_error_logs INSERT to caller's own identity/tenant
DROP POLICY IF EXISTS "Authenticated can insert error logs" ON public.system_error_logs;
CREATE POLICY "Authenticated can insert error logs"
ON public.system_error_logs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = auth.uid())
  AND (tenant_id IS NULL OR tenant_id = get_user_company_id(auth.uid()))
);
