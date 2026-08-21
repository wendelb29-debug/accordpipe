
-- 1. Create closer_settings table if not exists (handling multi-tenant)
CREATE TABLE IF NOT EXISTS public.workspace_closer_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE NOT NULL,
    closer_enabled boolean DEFAULT false,
    playbook_id uuid REFERENCES public.closer_playbooks(id) ON DELETE SET NULL,
    default_send_message_script_id uuid REFERENCES public.closer_scripts(id) ON DELETE SET NULL,
    default_whatsapp_script_id uuid REFERENCES public.closer_scripts(id) ON DELETE SET NULL,
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_closer_settings TO authenticated;
GRANT ALL ON public.workspace_closer_settings TO service_role;

-- 3. RLS
ALTER TABLE public.workspace_closer_settings ENABLE ROW LEVEL SECURITY;

-- Attempt to drop old policy if exists to avoid error on retry
DROP POLICY IF EXISTS "Admins and CEOs can manage workspace settings" ON public.workspace_closer_settings;
CREATE POLICY "Admins and CEOs can manage workspace settings"
ON public.workspace_closer_settings
FOR ALL
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR (SELECT is_master FROM profiles WHERE user_id = auth.uid()))
  AND tenant_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR (SELECT is_master FROM profiles WHERE user_id = auth.uid()))
  AND tenant_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Members can read workspace settings" ON public.workspace_closer_settings;
CREATE POLICY "Members can read workspace settings"
ON public.workspace_closer_settings
FOR SELECT
TO authenticated
USING (tenant_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- 4. Audit Log Trigger
CREATE OR REPLACE FUNCTION public.audit_closer_settings_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    NEW.tenant_id,
    auth.uid(),
    TG_OP,
    'workspace_closer_settings',
    NEW.id,
    jsonb_build_object(
        'workspace_id', NEW.workspace_id,
        'closer_enabled', NEW.closer_enabled,
        'playbook_id', NEW.playbook_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_closer_settings_trigger ON public.workspace_closer_settings;
CREATE TRIGGER audit_closer_settings_trigger
AFTER INSERT OR UPDATE ON public.workspace_closer_settings
FOR EACH ROW EXECUTE FUNCTION public.audit_closer_settings_changes();
