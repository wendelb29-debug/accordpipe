
-- 1. Extend chatbot_communication_settings
ALTER TABLE public.chatbot_communication_settings
  ADD COLUMN IF NOT EXISTS transfer_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS transfer_default_priority text NOT NULL DEFAULT 'medium';

-- 2. New table: chatbot_agent_teams
CREATE TABLE IF NOT EXISTS public.chatbot_agent_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid,
  team_id uuid NOT NULL REFERENCES public.chatbot_teams(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, agent_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_chatbot_agent_teams_tenant ON public.chatbot_agent_teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_agent_teams_agent ON public.chatbot_agent_teams(tenant_id, agent_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_agent_teams TO authenticated;
GRANT ALL ON public.chatbot_agent_teams TO service_role;

ALTER TABLE public.chatbot_agent_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cat_select_same_tenant" ON public.chatbot_agent_teams
  FOR SELECT TO authenticated
  USING (
    public.is_master(auth.uid())
    OR tenant_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "cat_write_admin_only" ON public.chatbot_agent_teams
  FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR (
      tenant_id = public.get_user_company_id(auth.uid())
      AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR (
      tenant_id = public.get_user_company_id(auth.uid())
      AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE TRIGGER trg_chatbot_agent_teams_touch
  BEFORE UPDATE ON public.chatbot_agent_teams
  FOR EACH ROW EXECUTE FUNCTION public.chatbot_touch_updated_at();
