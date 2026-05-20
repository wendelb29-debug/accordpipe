
-- pulse_agent_settings additions
ALTER TABLE public.pulse_agent_settings
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS max_messages_per_lead integer DEFAULT 8,
  ADD COLUMN IF NOT EXISTS max_negotiation_days integer DEFAULT 14,
  ADD COLUMN IF NOT EXISTS auto_pause_on_end_date boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_reply_inbound boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_start_conversations boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_approval_first_message boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_approval_sensitive_objection boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS block_outside_window boolean DEFAULT true;

-- pulse_outbound_leads additions
ALTER TABLE public.pulse_outbound_leads
  ADD COLUMN IF NOT EXISTS ai_typing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_ai_note text,
  ADD COLUMN IF NOT EXISTS next_goal text,
  ADD COLUMN IF NOT EXISTS last_ai_recommendation text,
  ADD COLUMN IF NOT EXISTS negotiation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS negotiation_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_takeover_by uuid,
  ADD COLUMN IF NOT EXISTS manual_takeover_at timestamptz;

-- whatsapp_messages additions
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS pulse_source text,
  ADD COLUMN IF NOT EXISTS pulse_lead_id uuid,
  ADD COLUMN IF NOT EXISTS pulse_campaign_id uuid,
  ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false;

-- pulse_agent_events additions (sentiment, next_goal)
ALTER TABLE public.pulse_agent_events
  ADD COLUMN IF NOT EXISTS detected_sentiment text,
  ADD COLUMN IF NOT EXISTS next_goal text;

-- pulse_knowledge_base
CREATE TABLE IF NOT EXISTS public.pulse_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.pulse_campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('texto','faq','oferta','objecoes','politica','case','script')),
  content text NOT NULL,
  priority integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pulse_knowledge_base_campaign ON public.pulse_knowledge_base(campaign_id);

ALTER TABLE public.pulse_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pulse_kb_select_company" ON public.pulse_knowledge_base;
CREATE POLICY "pulse_kb_select_company" ON public.pulse_knowledge_base FOR SELECT
USING (EXISTS (SELECT 1 FROM public.pulse_campaigns c
  WHERE c.id = pulse_knowledge_base.campaign_id
    AND c.company_id = public.get_user_company_id(auth.uid())));

DROP POLICY IF EXISTS "pulse_kb_modify_company" ON public.pulse_knowledge_base;
CREATE POLICY "pulse_kb_modify_company" ON public.pulse_knowledge_base FOR ALL
USING (EXISTS (SELECT 1 FROM public.pulse_campaigns c
  WHERE c.id = pulse_knowledge_base.campaign_id
    AND c.company_id = public.get_user_company_id(auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.pulse_campaigns c
  WHERE c.id = pulse_knowledge_base.campaign_id
    AND c.company_id = public.get_user_company_id(auth.uid())));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_pulse_kb_updated ON public.pulse_knowledge_base;
CREATE TRIGGER trg_pulse_kb_updated BEFORE UPDATE ON public.pulse_knowledge_base
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Realtime
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
ALTER TABLE public.pulse_outbound_leads REPLICA IDENTITY FULL;
ALTER TABLE public.pulse_agent_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_outbound_leads; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_agent_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
