DROP POLICY IF EXISTS "Tenant managers can view workspace permissions" ON public.user_workspace_permissions;
DROP POLICY IF EXISTS "Tenant managers can insert workspace permissions" ON public.user_workspace_permissions;
DROP POLICY IF EXISTS "Tenant managers can update workspace permissions" ON public.user_workspace_permissions;
DROP POLICY IF EXISTS "Tenant managers can delete workspace permissions" ON public.user_workspace_permissions;

CREATE POLICY "Tenant managers can view workspace permissions"
ON public.user_workspace_permissions
FOR SELECT
TO authenticated
USING (
  public.is_master(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = user_workspace_permissions.tenant_id
      AND ut.status IN ('ativo', 'active')
      AND ut.role = ANY (ARRAY['admin'::text, 'ceo'::text, 'master'::text])
  )
);

CREATE POLICY "Tenant managers can insert workspace permissions"
ON public.user_workspace_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = user_workspace_permissions.tenant_id
        AND ut.status IN ('ativo', 'active')
        AND ut.role = ANY (ARRAY['admin'::text, 'ceo'::text, 'master'::text])
    )
  )
  AND EXISTS (
    SELECT 1
    FROM public.user_tenants target_ut
    WHERE target_ut.user_id = user_workspace_permissions.user_id
      AND target_ut.tenant_id = user_workspace_permissions.tenant_id
      AND target_ut.status IN ('ativo', 'active')
  )
  AND EXISTS (
    SELECT 1
    FROM public.workspaces ws
    WHERE ws.id = user_workspace_permissions.workspace_id
      AND ws.servidor_id = user_workspace_permissions.tenant_id
  )
);

CREATE POLICY "Tenant managers can update workspace permissions"
ON public.user_workspace_permissions
FOR UPDATE
TO authenticated
USING (
  public.is_master(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = user_workspace_permissions.tenant_id
      AND ut.status IN ('ativo', 'active')
      AND ut.role = ANY (ARRAY['admin'::text, 'ceo'::text, 'master'::text])
  )
)
WITH CHECK (
  (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = user_workspace_permissions.tenant_id
        AND ut.status IN ('ativo', 'active')
        AND ut.role = ANY (ARRAY['admin'::text, 'ceo'::text, 'master'::text])
    )
  )
  AND EXISTS (
    SELECT 1
    FROM public.user_tenants target_ut
    WHERE target_ut.user_id = user_workspace_permissions.user_id
      AND target_ut.tenant_id = user_workspace_permissions.tenant_id
      AND target_ut.status IN ('ativo', 'active')
  )
  AND EXISTS (
    SELECT 1
    FROM public.workspaces ws
    WHERE ws.id = user_workspace_permissions.workspace_id
      AND ws.servidor_id = user_workspace_permissions.tenant_id
  )
);

CREATE POLICY "Tenant managers can delete workspace permissions"
ON public.user_workspace_permissions
FOR DELETE
TO authenticated
USING (
  public.is_master(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = user_workspace_permissions.tenant_id
      AND ut.status IN ('ativo', 'active')
      AND ut.role = ANY (ARRAY['admin'::text, 'ceo'::text, 'master'::text])
  )
);