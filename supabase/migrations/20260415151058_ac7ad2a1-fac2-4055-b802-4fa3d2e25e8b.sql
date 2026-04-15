
-- Helper function: check if the current user's company is a reseller of a given tenant
CREATE OR REPLACE FUNCTION public.user_is_reseller_of(_child_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _child_tenant_id
      AND (c.parent_tenant_id = get_user_company_id(auth.uid()) OR c.created_by_tenant_id = get_user_company_id(auth.uid()))
      AND EXISTS (
        SELECT 1 FROM public.companies parent
        WHERE parent.id = get_user_company_id(auth.uid())
          AND parent.is_reseller = true
      )
  );
$$;

-- ===========================================
-- COMPANIES: Reseller can view child tenants
-- ===========================================
CREATE POLICY "Resellers can view child tenants"
ON public.companies
FOR SELECT
TO authenticated
USING (
  public.user_is_reseller_of(id)
);

-- COMPANIES: Reseller can update child tenants
CREATE POLICY "Resellers can update child tenants"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  public.user_is_reseller_of(id)
  AND public.has_permission(auth.uid(), 'edit_child_tenants')
);

-- ===========================================
-- TENANT_SUBSCRIPTIONS: Reseller access
-- ===========================================
CREATE POLICY "Resellers can view child subscriptions"
ON public.tenant_subscriptions
FOR SELECT
TO authenticated
USING (
  public.user_is_reseller_of(tenant_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_subscription')
);

CREATE POLICY "Resellers can insert child subscriptions"
ON public.tenant_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_reseller_of(tenant_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_subscription')
);

CREATE POLICY "Resellers can update child subscriptions"
ON public.tenant_subscriptions
FOR UPDATE
TO authenticated
USING (
  public.user_is_reseller_of(tenant_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_subscription')
);

-- ===========================================
-- TENANT_SUBSCRIPTION_HISTORY: Reseller access
-- ===========================================
CREATE POLICY "Resellers can view child subscription history"
ON public.tenant_subscription_history
FOR SELECT
TO authenticated
USING (
  public.user_is_reseller_of(tenant_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_subscription')
);

CREATE POLICY "Resellers can insert child subscription history"
ON public.tenant_subscription_history
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_reseller_of(tenant_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_subscription')
);

-- ===========================================
-- PROFILES: Reseller can manage child tenant users
-- ===========================================
CREATE POLICY "Resellers can view child tenant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.user_is_reseller_of(company_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_users')
);

CREATE POLICY "Resellers can update child tenant profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.user_is_reseller_of(company_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_users')
);

CREATE POLICY "Resellers can insert child tenant profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_reseller_of(company_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_users')
);

-- ===========================================
-- USER_TENANTS: Reseller can manage child tenant links
-- ===========================================
CREATE POLICY "Resellers can view child tenant user links"
ON public.user_tenants
FOR SELECT
TO authenticated
USING (
  public.user_is_reseller_of(tenant_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_users')
);

CREATE POLICY "Resellers can insert child tenant user links"
ON public.user_tenants
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_reseller_of(tenant_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_users')
);

CREATE POLICY "Resellers can update child tenant user links"
ON public.user_tenants
FOR UPDATE
TO authenticated
USING (
  public.user_is_reseller_of(tenant_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_users')
);

CREATE POLICY "Resellers can delete child tenant user links"
ON public.user_tenants
FOR DELETE
TO authenticated
USING (
  public.user_is_reseller_of(tenant_id)
  AND public.has_permission(auth.uid(), 'manage_child_tenant_users')
);

-- ===========================================
-- USER_ROLES: Reseller can manage roles for child tenant users
-- ===========================================
CREATE POLICY "Resellers can view child tenant user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.user_is_reseller_of(get_profile_company_id(user_id))
  AND public.has_permission(auth.uid(), 'manage_child_tenant_users')
);

CREATE POLICY "Resellers can insert child tenant user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_reseller_of(get_profile_company_id(user_id))
  AND public.has_permission(auth.uid(), 'manage_child_tenant_users')
);

CREATE POLICY "Resellers can update child tenant user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.user_is_reseller_of(get_profile_company_id(user_id))
  AND public.has_permission(auth.uid(), 'manage_child_tenant_users')
);

CREATE POLICY "Resellers can delete child tenant user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.user_is_reseller_of(get_profile_company_id(user_id))
  AND public.has_permission(auth.uid(), 'manage_child_tenant_users')
);
