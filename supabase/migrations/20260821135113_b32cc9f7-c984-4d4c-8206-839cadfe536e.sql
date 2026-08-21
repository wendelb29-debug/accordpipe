-- billing_plans: writes restricted to platform master only
DROP POLICY IF EXISTS "CEO/master can insert plans" ON public.billing_plans;
DROP POLICY IF EXISTS "CEO/master can update plans" ON public.billing_plans;
DROP POLICY IF EXISTS "CEO/master can delete plans" ON public.billing_plans;

CREATE POLICY "Master can insert plans"
ON public.billing_plans FOR INSERT TO authenticated
WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Master can update plans"
ON public.billing_plans FOR UPDATE TO authenticated
USING (public.is_master(auth.uid()))
WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Master can delete plans"
ON public.billing_plans FOR DELETE TO authenticated
USING (public.is_master(auth.uid()));

-- role_default_permissions: platform-wide defaults, master-only writes
DROP POLICY IF EXISTS "Admin/master can manage role_default_permissions" ON public.role_default_permissions;

CREATE POLICY "Master can manage role_default_permissions"
ON public.role_default_permissions FOR ALL TO authenticated
USING (public.is_master(auth.uid()))
WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Authenticated can view role_default_permissions"
ON public.role_default_permissions FOR SELECT TO authenticated
USING (true);