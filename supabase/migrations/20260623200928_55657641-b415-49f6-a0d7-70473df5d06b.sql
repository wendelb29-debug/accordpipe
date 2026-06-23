
-- Drop recursive policy and redundant duplicates on user_tenants
DROP POLICY IF EXISTS "Admins can view company tenant links" ON public.user_tenants;
DROP POLICY IF EXISTS "Admins can view tenant links" ON public.user_tenants;
DROP POLICY IF EXISTS "Users can view their own tenant links" ON public.user_tenants;
DROP POLICY IF EXISTS "Resellers can view child tenant user links" ON public.user_tenants;
DROP POLICY IF EXISTS "Resellers can insert child tenant user links" ON public.user_tenants;
DROP POLICY IF EXISTS "Resellers can update child tenant user links" ON public.user_tenants;
DROP POLICY IF EXISTS "Resellers can delete child tenant user links" ON public.user_tenants;

-- Recreate non-recursive admin view policy using SECURITY DEFINER helper
CREATE POLICY "Admins can view tenant links in their company"
  ON public.user_tenants
  FOR SELECT
  TO authenticated
  USING (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  );

-- Recreate reseller policies (user_is_reseller_of is SECURITY DEFINER, doesn't read user_tenants)
CREATE POLICY "Resellers view child tenant user links"
  ON public.user_tenants FOR SELECT TO authenticated
  USING (public.user_is_reseller_of(tenant_id) AND public.has_permission(auth.uid(), 'manage_child_tenant_users'));

CREATE POLICY "Resellers insert child tenant user links"
  ON public.user_tenants FOR INSERT TO authenticated
  WITH CHECK (public.user_is_reseller_of(tenant_id) AND public.has_permission(auth.uid(), 'manage_child_tenant_users'));

CREATE POLICY "Resellers update child tenant user links"
  ON public.user_tenants FOR UPDATE TO authenticated
  USING (public.user_is_reseller_of(tenant_id) AND public.has_permission(auth.uid(), 'manage_child_tenant_users'));

CREATE POLICY "Resellers delete child tenant user links"
  ON public.user_tenants FOR DELETE TO authenticated
  USING (public.user_is_reseller_of(tenant_id) AND public.has_permission(auth.uid(), 'manage_child_tenant_users'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tenants TO authenticated;
GRANT ALL ON public.user_tenants TO service_role;
