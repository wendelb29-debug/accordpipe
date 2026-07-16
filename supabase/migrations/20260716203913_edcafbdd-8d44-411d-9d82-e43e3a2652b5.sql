
-- =============== chatbot_teams ===============
CREATE TABLE public.chatbot_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  icon TEXT NOT NULL DEFAULT 'Users',
  department_id UUID REFERENCES public.tenant_departments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  priority INTEGER NOT NULL DEFAULT 100,
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  channels TEXT[] NOT NULL DEFAULT ARRAY['whatsapp']::text[],
  attend_holidays BOOLEAN NOT NULL DEFAULT false,
  max_concurrent_per_agent INTEGER NOT NULL DEFAULT 5,
  max_wait_seconds INTEGER NOT NULL DEFAULT 300,
  offhours_message TEXT,
  fallback_team_id UUID REFERENCES public.chatbot_teams(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX idx_chatbot_teams_tenant ON public.chatbot_teams(tenant_id);
CREATE INDEX idx_chatbot_teams_priority ON public.chatbot_teams(tenant_id, priority);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_teams TO authenticated;
GRANT ALL ON public.chatbot_teams TO service_role;

ALTER TABLE public.chatbot_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view chatbot teams"
ON public.chatbot_teams FOR SELECT
USING (public.is_master(auth.uid()) OR tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins manage chatbot teams"
ON public.chatbot_teams FOR ALL
USING (
  public.is_master(auth.uid()) OR (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  public.is_master(auth.uid()) OR (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- =============== chatbot_team_members ===============
CREATE TABLE public.chatbot_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.chatbot_teams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('owner','supervisor','agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
CREATE INDEX idx_chatbot_team_members_team ON public.chatbot_team_members(team_id);
CREATE INDEX idx_chatbot_team_members_user ON public.chatbot_team_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_team_members TO authenticated;
GRANT ALL ON public.chatbot_team_members TO service_role;

ALTER TABLE public.chatbot_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view team members"
ON public.chatbot_team_members FOR SELECT
USING (public.is_master(auth.uid()) OR tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins manage team members"
ON public.chatbot_team_members FOR ALL
USING (
  public.is_master(auth.uid()) OR (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  public.is_master(auth.uid()) OR (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- =============== chatbot_team_rules ===============
CREATE TABLE public.chatbot_team_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.chatbot_teams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ai_description TEXT,
  subjects TEXT[] NOT NULL DEFAULT '{}'::text[],
  keywords TEXT[] NOT NULL DEFAULT '{}'::text[],
  intents TEXT[] NOT NULL DEFAULT '{}'::text[],
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  allowed_channels TEXT[] NOT NULL DEFAULT ARRAY['whatsapp']::text[],
  transfer_mode TEXT NOT NULL DEFAULT 'auto' CHECK (transfer_mode IN ('auto','confirm')),
  message_before TEXT,
  message_after TEXT,
  unavailable_action TEXT NOT NULL DEFAULT 'stay_bot'
    CHECK (unavailable_action IN ('stay_bot','send_unavailable','create_callback','schedule_contact','transfer_other','close')),
  fallback_team_id UUID REFERENCES public.chatbot_teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id)
);
CREATE INDEX idx_chatbot_team_rules_tenant ON public.chatbot_team_rules(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_team_rules TO authenticated;
GRANT ALL ON public.chatbot_team_rules TO service_role;

ALTER TABLE public.chatbot_team_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view team rules"
ON public.chatbot_team_rules FOR SELECT
USING (public.is_master(auth.uid()) OR tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins manage team rules"
ON public.chatbot_team_rules FOR ALL
USING (
  public.is_master(auth.uid()) OR (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  public.is_master(auth.uid()) OR (
    tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- =============== updated_at triggers ===============
CREATE OR REPLACE FUNCTION public.chatbot_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_chatbot_teams_updated
BEFORE UPDATE ON public.chatbot_teams
FOR EACH ROW EXECUTE FUNCTION public.chatbot_touch_updated_at();

CREATE TRIGGER trg_chatbot_team_rules_updated
BEFORE UPDATE ON public.chatbot_team_rules
FOR EACH ROW EXECUTE FUNCTION public.chatbot_touch_updated_at();
