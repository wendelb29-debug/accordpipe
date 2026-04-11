
-- Add missing columns to user_tenants
ALTER TABLE public.user_tenants
  ADD COLUMN IF NOT EXISTS data_scope text NOT NULL DEFAULT 'own',
  ADD COLUMN IF NOT EXISTS custom_permissions jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_workspace_ids uuid[] DEFAULT '{}';

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON public.user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON public.user_tenants(user_id);

-- Ensure RLS is enabled
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to recreate
DROP POLICY IF EXISTS "Users can view their own tenant links" ON public.user_tenants;
DROP POLICY IF EXISTS "Admins can view all tenant links for their company" ON public.user_tenants;
DROP POLICY IF EXISTS "Admins can insert tenant links" ON public.user_tenants;
DROP POLICY IF EXISTS "Admins can update tenant links" ON public.user_tenants;
DROP POLICY IF EXISTS "Admins can delete tenant links" ON public.user_tenants;

-- Users can see their own tenant links
CREATE POLICY "Users can view their own tenant links"
  ON public.user_tenants FOR SELECT
  USING (auth.uid() = user_id);

-- Master/CEO/Admin can see all links for tenants they manage
CREATE POLICY "Admins can view all tenant links for their company"
  ON public.user_tenants FOR SELECT
  USING (
    public.is_master(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.user_tenants ut2
      WHERE ut2.user_id = auth.uid()
        AND ut2.tenant_id = public.user_tenants.tenant_id
        AND ut2.role IN ('ceo', 'admin', 'master')
    )
  );

-- Master/CEO/Admin can insert links
CREATE POLICY "Admins can insert tenant links"
  ON public.user_tenants FOR INSERT
  WITH CHECK (
    public.is_master(auth.uid())
    OR public.has_permission(auth.uid(), 'create_user')
  );

-- Master/CEO/Admin can update links
CREATE POLICY "Admins can update tenant links"
  ON public.user_tenants FOR UPDATE
  USING (
    public.is_master(auth.uid())
    OR public.has_permission(auth.uid(), 'edit_user')
  );

-- Master/CEO/Admin can delete links
CREATE POLICY "Admins can delete tenant links"
  ON public.user_tenants FOR DELETE
  USING (
    public.is_master(auth.uid())
    OR public.has_permission(auth.uid(), 'edit_user')
  );
