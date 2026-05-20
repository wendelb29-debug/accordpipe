
-- 1. Expand status on pulse_outbound_leads
ALTER TABLE public.pulse_outbound_leads
  DROP CONSTRAINT IF EXISTS pulse_outbound_leads_status_check;

ALTER TABLE public.pulse_outbound_leads
  ADD CONSTRAINT pulse_outbound_leads_status_check
  CHECK (status IN (
    'queued','warming','replied','meeting','won','lost','paused',
    'aguardando_inicio','em_cadencia','respondeu','negociando','objecao',
    'agendar','reuniao_marcada','ganho','perdido','precisa_humano','opt_out'
  ));

-- 2. New columns on pulse_outbound_leads
ALTER TABLE public.pulse_outbound_leads
  ADD COLUMN IF NOT EXISTS auto_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS sentiment text,
  ADD COLUMN IF NOT EXISTS messages_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts integer,
  ADD COLUMN IF NOT EXISTS next_action_type text NOT NULL DEFAULT 'send_message',
  ADD COLUMN IF NOT EXISTS needs_human boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opt_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_outbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversation_summary text;

CREATE INDEX IF NOT EXISTS idx_pulse_outbound_next_action
  ON public.pulse_outbound_leads(next_action_at)
  WHERE auto_enabled = true AND needs_human = false AND opt_out = false;

CREATE INDEX IF NOT EXISTS idx_pulse_outbound_contact
  ON public.pulse_outbound_leads(whatsapp_contact_id);

-- 3. pulse_agent_settings (1 per campaign)
CREATE TABLE IF NOT EXISTS public.pulse_agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  daily_limit integer NOT NULL DEFAULT 40,
  send_window_start time NOT NULL DEFAULT '09:00',
  send_window_end time NOT NULL DEFAULT '18:00',
  send_weekdays integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  min_delay_minutes integer NOT NULL DEFAULT 45,
  max_delay_minutes integer NOT NULL DEFAULT 180,
  max_attempts_per_lead integer NOT NULL DEFAULT 6,
  stop_on_opt_out boolean NOT NULL DEFAULT true,
  stop_on_human_request boolean NOT NULL DEFAULT true,
  stop_on_meeting boolean NOT NULL DEFAULT true,
  playbook text NOT NULL DEFAULT '',
  known_objections text NOT NULL DEFAULT '',
  main_offer text NOT NULL DEFAULT '',
  scheduling_instructions text NOT NULL DEFAULT '',
  tone text NOT NULL DEFAULT 'Humano, consultivo, breve e natural.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_pulse_agent_settings_updated_at
  BEFORE UPDATE ON public.pulse_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.pulse_agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_agent_settings master all" ON public.pulse_agent_settings
  FOR ALL USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "pulse_agent_settings tenant select" ON public.pulse_agent_settings
  FOR SELECT USING (
    campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id = public.get_user_company_id(auth.uid()))
  );

CREATE POLICY "pulse_agent_settings tenant insert" ON public.pulse_agent_settings
  FOR INSERT WITH CHECK (
    campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id = public.get_user_company_id(auth.uid()))
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.has_role(auth.uid(),'comercial'::app_role))
  );

CREATE POLICY "pulse_agent_settings tenant update" ON public.pulse_agent_settings
  FOR UPDATE USING (
    campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id = public.get_user_company_id(auth.uid()))
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role) OR public.has_role(auth.uid(),'comercial'::app_role))
  );

CREATE POLICY "pulse_agent_settings tenant delete" ON public.pulse_agent_settings
  FOR DELETE USING (
    campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id = public.get_user_company_id(auth.uid()))
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role))
  );

-- 4. pulse_agent_events (audit log)
CREATE TABLE IF NOT EXISTS public.pulse_agent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  pulse_lead_id uuid NOT NULL REFERENCES public.pulse_outbound_leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  direction text,
  message text,
  ai_reasoning text,
  detected_intent text,
  detected_objection text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pulse_agent_events_lead ON public.pulse_agent_events(pulse_lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_agent_events_campaign ON public.pulse_agent_events(campaign_id, created_at DESC);

ALTER TABLE public.pulse_agent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_agent_events master all" ON public.pulse_agent_events
  FOR ALL USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "pulse_agent_events tenant select" ON public.pulse_agent_events
  FOR SELECT USING (
    campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id = public.get_user_company_id(auth.uid()))
  );

CREATE POLICY "pulse_agent_events tenant insert" ON public.pulse_agent_events
  FOR INSERT WITH CHECK (
    campaign_id IN (SELECT id FROM public.pulse_campaigns WHERE company_id = public.get_user_company_id(auth.uid()))
  );
