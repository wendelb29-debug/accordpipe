
-- Create table for workspace-level permissions per user
CREATE TABLE public.user_workspace_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

ALTER TABLE public.user_workspace_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace permissions"
  ON public.user_workspace_permissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all workspace permissions"
  ON public.user_workspace_permissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid() AND ut.tenant_id = user_workspace_permissions.tenant_id
        AND ut.role IN ('admin', 'ceo', 'master')
    )
  );

CREATE POLICY "Admins can insert workspace permissions"
  ON public.user_workspace_permissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid() AND ut.tenant_id = user_workspace_permissions.tenant_id
        AND ut.role IN ('admin', 'ceo', 'master')
    )
  );

CREATE POLICY "Admins can update workspace permissions"
  ON public.user_workspace_permissions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid() AND ut.tenant_id = user_workspace_permissions.tenant_id
        AND ut.role IN ('admin', 'ceo', 'master')
    )
  );

CREATE POLICY "Admins can delete workspace permissions"
  ON public.user_workspace_permissions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid() AND ut.tenant_id = user_workspace_permissions.tenant_id
        AND ut.role IN ('admin', 'ceo', 'master')
    )
  );

CREATE INDEX idx_uwp_user ON public.user_workspace_permissions(user_id);
CREATE INDEX idx_uwp_tenant ON public.user_workspace_permissions(tenant_id);
CREATE INDEX idx_uwp_workspace ON public.user_workspace_permissions(workspace_id);

-- Helper function: check if user can access a workspace
CREATE OR REPLACE FUNCTION public.user_can_access_workspace(
  _user_id UUID,
  _workspace_id UUID,
  _permission TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.user_tenants ut
        JOIN public.workspaces w ON w.servidor_id = ut.tenant_id
        WHERE ut.user_id = _user_id AND w.id = _workspace_id
          AND ut.role IN ('ceo', 'master')
      ) THEN true
      WHEN _permission = 'view' THEN EXISTS (
        SELECT 1 FROM public.user_workspace_permissions
        WHERE user_id = _user_id AND workspace_id = _workspace_id AND can_view = true
      )
      WHEN _permission = 'edit' THEN EXISTS (
        SELECT 1 FROM public.user_workspace_permissions
        WHERE user_id = _user_id AND workspace_id = _workspace_id AND can_edit = true
      )
      WHEN _permission = 'delete' THEN EXISTS (
        SELECT 1 FROM public.user_workspace_permissions
        WHERE user_id = _user_id AND workspace_id = _workspace_id AND can_delete = true
      )
      ELSE false
    END
$$;
