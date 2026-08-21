
CREATE TABLE IF NOT EXISTS public.workspace_closer_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
    closer_enabled boolean NOT NULL DEFAULT false,
    playbook_id uuid REFERENCES public.closer_playbooks(id) ON DELETE SET NULL,
    default_send_message_script_id uuid REFERENCES public.closer_scripts(id) ON DELETE SET NULL,
    default_whatsapp_script_id uuid REFERENCES public.closer_scripts(id) ON DELETE SET NULL,
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_closer_settings TO authenticated;
GRANT ALL ON public.workspace_closer_settings TO service_role;

-- Enable RLS
ALTER TABLE public.workspace_closer_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Workspace closer settings are viewable by tenant members"
ON public.workspace_closer_settings FOR SELECT
TO authenticated
USING (tenant_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Workspace closer settings are manageable by admins"
ON public.workspace_closer_settings FOR ALL
TO authenticated
USING (
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) = tenant_id AND
  (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'ceo') OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true)
  )
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_workspace_closer_settings_workspace ON public.workspace_closer_settings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_closer_settings_tenant ON public.workspace_closer_settings(tenant_id);
