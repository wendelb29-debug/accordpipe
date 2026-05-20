
-- pulse_campaigns
CREATE TABLE public.pulse_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  objective text NOT NULL DEFAULT '',
  offer text NOT NULL DEFAULT '',
  tone text NOT NULL DEFAULT 'Humano, consultivo e direto.',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed')),
  max_daily_messages integer NOT NULL DEFAULT 40,
  human_delay_minutes integer NOT NULL DEFAULT 180,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pulse_campaigns_company ON public.pulse_campaigns(company_id);

CREATE TRIGGER trg_pulse_campaigns_updated_at
BEFORE UPDATE ON public.pulse_campaigns
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- pulse_outbound_leads
CREATE TABLE public.pulse_outbound_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  crm_lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  whatsapp_contact_id uuid NULL REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','warming','replied','meeting','won','lost','paused')),
  stage text NOT NULL DEFAULT 'abertura' CHECK (stage IN ('abertura','dor','prova','objecao','agenda')),
  temperature integer NOT NULL DEFAULT 15 CHECK (temperature BETWEEN 0 AND 100),
  attempts integer NOT NULL DEFAULT 0,
  last_objection text NULL,
  next_message text NULL,
  next_action_at timestamptz NULL,
  last_sent_at timestamptz NULL,
  meeting_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, crm_lead_id)
);

CREATE INDEX idx_pulse_outbound_campaign ON public.pulse_outbound_leads(campaign_id);
CREATE INDEX idx_pulse_outbound_lead ON public.pulse_outbound_leads(crm_lead_id);

CREATE TRIGGER trg_pulse_outbound_leads_updated_at
BEFORE UPDATE ON public.pulse_outbound_leads
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.pulse_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_outbound_leads ENABLE ROW LEVEL SECURITY;

-- pulse_campaigns policies
CREATE POLICY "pulse_campaigns master all"
ON public.pulse_campaigns FOR ALL
USING (public.is_master(auth.uid()))
WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "pulse_campaigns tenant select"
ON public.pulse_campaigns FOR SELECT
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "pulse_campaigns tenant insert"
ON public.pulse_campaigns FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'comercial'::app_role)
  )
);

CREATE POLICY "pulse_campaigns tenant update"
ON public.pulse_campaigns FOR UPDATE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'comercial'::app_role)
  )
);

CREATE POLICY "pulse_campaigns tenant delete"
ON public.pulse_campaigns FOR DELETE
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
  )
);

-- pulse_outbound_leads policies
CREATE POLICY "pulse_outbound master all"
ON public.pulse_outbound_leads FOR ALL
USING (public.is_master(auth.uid()))
WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "pulse_outbound tenant select"
ON public.pulse_outbound_leads FOR SELECT
USING (
  campaign_id IN (
    SELECT id FROM public.pulse_campaigns
    WHERE company_id = public.get_user_company_id(auth.uid())
  )
);

CREATE POLICY "pulse_outbound tenant insert"
ON public.pulse_outbound_leads FOR INSERT
WITH CHECK (
  campaign_id IN (
    SELECT id FROM public.pulse_campaigns
    WHERE company_id = public.get_user_company_id(auth.uid())
  )
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'comercial'::app_role)
  )
);

CREATE POLICY "pulse_outbound tenant update"
ON public.pulse_outbound_leads FOR UPDATE
USING (
  campaign_id IN (
    SELECT id FROM public.pulse_campaigns
    WHERE company_id = public.get_user_company_id(auth.uid())
  )
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'comercial'::app_role)
  )
);

CREATE POLICY "pulse_outbound tenant delete"
ON public.pulse_outbound_leads FOR DELETE
USING (
  campaign_id IN (
    SELECT id FROM public.pulse_campaigns
    WHERE company_id = public.get_user_company_id(auth.uid())
  )
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
  )
);
