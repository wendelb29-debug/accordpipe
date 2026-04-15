
-- 1. Add reseller columns to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS tenant_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS parent_tenant_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_tenant_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS can_create_tenants boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_child_tenants boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_child_tenants integer,
  ADD COLUMN IF NOT EXISTS is_reseller boolean NOT NULL DEFAULT false;

-- 2. Index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_companies_parent_tenant ON public.companies(parent_tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_created_by_tenant ON public.companies(created_by_tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_type ON public.companies(tenant_type);

-- 3. Helper: check if tenant A is the reseller/parent of tenant B
CREATE OR REPLACE FUNCTION public.is_reseller_of(_reseller_id uuid, _child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = _child_id
      AND (parent_tenant_id = _reseller_id OR created_by_tenant_id = _reseller_id)
  );
$$;

-- 4. Helper: get tenant_type for a tenant
CREATE OR REPLACE FUNCTION public.get_tenant_type(_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(tenant_type, 'standard') FROM public.companies WHERE id = _tenant_id LIMIT 1;
$$;

-- 5. Helper: count active child tenants
CREATE OR REPLACE FUNCTION public.count_child_tenants(_reseller_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.companies
  WHERE (parent_tenant_id = _reseller_id OR created_by_tenant_id = _reseller_id)
    AND id != _reseller_id;
$$;

-- 6. Helper: can reseller add more child tenants
CREATE OR REPLACE FUNCTION public.reseller_can_add_child(_reseller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.companies WHERE id = _reseller_id AND is_reseller = true) THEN false
    WHEN (SELECT max_child_tenants FROM public.companies WHERE id = _reseller_id) IS NULL THEN true
    WHEN (SELECT max_child_tenants FROM public.companies WHERE id = _reseller_id) > public.count_child_tenants(_reseller_id) THEN true
    ELSE false
  END;
$$;

-- 7. Insert reseller permissions into role_default_permissions for ceo and master roles
INSERT INTO public.role_default_permissions (role, permission_key, data_scope)
VALUES
  ('ceo', 'create_child_tenants', 'all'),
  ('ceo', 'view_child_tenants', 'all'),
  ('ceo', 'edit_child_tenants', 'all'),
  ('ceo', 'delete_child_tenants', 'all'),
  ('ceo', 'manage_child_tenant_subscription', 'all'),
  ('ceo', 'manage_child_tenant_users', 'all'),
  ('ceo', 'view_child_tenant_usage', 'all'),
  ('ceo', 'view_child_tenant_billing', 'all'),
  ('master', 'create_child_tenants', 'all'),
  ('master', 'view_child_tenants', 'all'),
  ('master', 'edit_child_tenants', 'all'),
  ('master', 'delete_child_tenants', 'all'),
  ('master', 'manage_child_tenant_subscription', 'all'),
  ('master', 'manage_child_tenant_users', 'all'),
  ('master', 'view_child_tenant_usage', 'all'),
  ('master', 'view_child_tenant_billing', 'all')
ON CONFLICT DO NOTHING;
