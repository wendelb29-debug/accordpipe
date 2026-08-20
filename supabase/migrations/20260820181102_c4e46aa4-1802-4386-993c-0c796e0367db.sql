
-- Drop existing policies that might be using the wrong column names or logic
DROP POLICY IF EXISTS "Tenant managers can delete workspace permissions" ON public.user_workspace_permissions;
DROP POLICY IF EXISTS "Tenant managers can insert workspace permissions" ON public.user_workspace_permissions;
DROP POLICY IF EXISTS "Tenant managers can update workspace permissions" ON public.user_workspace_permissions;
DROP POLICY IF EXISTS "Tenant managers can view workspace permissions" ON public.user_workspace_permissions;
DROP POLICY IF EXISTS "Users can view own workspace permissions" ON public.user_workspace_permissions;

-- 1. Master platform users (is_master=true in profiles) can do anything
CREATE POLICY "Master users full access"
ON public.user_workspace_permissions
FOR ALL
TO authenticated
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));

-- 2. Tenant managers (admin/ceo/master roles) can manage permissions for users in the SAME tenant
-- Checking against user_tenants (which uses tenant_id)
CREATE POLICY "Managers can manage workspace permissions"
ON public.user_workspace_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = user_workspace_permissions.tenant_id
      AND ut.status IN ('ativo', 'active')
      AND ut.role IN ('admin', 'ceo', 'master')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = user_workspace_permissions.tenant_id
      AND ut.status IN ('ativo', 'active')
      AND ut.role IN ('admin', 'ceo', 'master')
  )
  AND EXISTS (
    SELECT 1 FROM public.user_tenants target_ut
    WHERE target_ut.user_id = user_workspace_permissions.user_id
      AND target_ut.tenant_id = user_workspace_permissions.tenant_id
  )
  AND EXISTS (
    SELECT 1 FROM public.workspaces ws
    WHERE ws.id = user_workspace_permissions.workspace_id
      AND ws.servidor_id = user_workspace_permissions.tenant_id
  )
);

-- 3. Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.user_workspace_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Re-verify GRANTS
GRANT ALL ON public.user_workspace_permissions TO authenticated;
GRANT ALL ON public.user_workspace_permissions TO service_role;
