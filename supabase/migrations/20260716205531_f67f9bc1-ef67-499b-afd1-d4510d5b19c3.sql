
-- 1) chatbot_communication_settings
CREATE TABLE public.chatbot_communication_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id uuid NULL,

  -- Comportamento
  auto_reply_enabled boolean NOT NULL DEFAULT true,
  reply_new_conversations boolean NOT NULL DEFAULT true,
  reply_existing_conversations boolean NOT NULL DEFAULT true,
  reply_delay_seconds integer NOT NULL DEFAULT 0,
  message_grouping_enabled boolean NOT NULL DEFAULT true,
  message_grouping_window_seconds integer NOT NULL DEFAULT 5,
  max_consecutive_replies integer NOT NULL DEFAULT 5,
  max_data_retry_attempts integer NOT NULL DEFAULT 3,
  max_messages_before_handoff integer NOT NULL DEFAULT 10,
  on_limit_reached text NOT NULL DEFAULT 'transfer' CHECK (on_limit_reached IN ('transfer','request_human','create_task','wait','close')),

  -- Formatação
  show_typing_indicator boolean NOT NULL DEFAULT true,
  typing_simulation text NOT NULL DEFAULT 'proportional' CHECK (typing_simulation IN ('none','fixed','proportional','random')),
  typing_min_ms integer NOT NULL DEFAULT 800,
  typing_max_ms integer NOT NULL DEFAULT 3500,
  split_long_messages boolean NOT NULL DEFAULT true,
  split_max_chars integer NOT NULL DEFAULT 400,
  split_interval_ms integer NOT NULL DEFAULT 800,
  split_max_blocks integer NOT NULL DEFAULT 4,

  -- Mídia e emojis
  emoji_policy text NOT NULL DEFAULT 'moderate' CHECK (emoji_policy IN ('none','moderate','contextual','free')),
  max_emojis_per_message integer NOT NULL DEFAULT 2,
  audio_transcribe_incoming boolean NOT NULL DEFAULT true,
  audio_reply_enabled boolean NOT NULL DEFAULT false,
  audio_voice text NULL,
  image_analysis_enabled boolean NOT NULL DEFAULT true,
  document_analysis_enabled boolean NOT NULL DEFAULT true,

  -- Handoff humano
  pause_ai_on_human_reply boolean NOT NULL DEFAULT true,
  resume_ai_mode text NOT NULL DEFAULT 'manual' CHECK (resume_ai_mode IN ('never','after_timeout','manual','on_stage','on_tag')),
  resume_ai_after_minutes integer NULL,
  resume_ai_on_stage_id uuid NULL,
  resume_ai_on_tag_id uuid NULL,
  transfer_intent_phrases jsonb NOT NULL DEFAULT '["quero falar com uma pessoa","quero falar com atendente","atendimento humano","falar com suporte","falar com vendedor","não quero falar com robô"]'::jsonb,

  -- Metadados
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,

  UNIQUE (tenant_id, agent_id)
);
CREATE INDEX idx_chatbot_comm_settings_tenant ON public.chatbot_communication_settings(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_communication_settings TO authenticated;
GRANT ALL ON public.chatbot_communication_settings TO service_role;
ALTER TABLE public.chatbot_communication_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_settings_select_same_tenant"
ON public.chatbot_communication_settings FOR SELECT TO authenticated
USING (tenant_id = public.get_user_company_id(auth.uid()) OR public.is_master(auth.uid()));

CREATE POLICY "comm_settings_write_admins"
ON public.chatbot_communication_settings FOR ALL TO authenticated
USING (
  (tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)))
  OR public.is_master(auth.uid())
)
WITH CHECK (
  (tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)))
  OR public.is_master(auth.uid())
);

CREATE TRIGGER trg_comm_settings_touch
BEFORE UPDATE ON public.chatbot_communication_settings
FOR EACH ROW EXECUTE FUNCTION public.chatbot_touch_updated_at();

-- 2) chatbot_message_templates
CREATE TABLE public.chatbot_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id uuid NULL,
  template_type text NOT NULL CHECK (template_type IN (
    'welcome','agent_intro','off_hours','unavailable',
    'transfer_started','transfer_completed','transfer_no_agent','transfer_waiting','transfer_taken','transfer_returned',
    'error','closing','inactivity_1','inactivity_2'
  )),
  enabled boolean NOT NULL DEFAULT true,
  content text NOT NULL DEFAULT '',
  channels jsonb NOT NULL DEFAULT '["whatsapp","instagram","messenger","webchat"]'::jsonb,
  media_url text NULL,
  media_type text NULL,
  extra_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  UNIQUE (tenant_id, agent_id, template_type)
);
CREATE INDEX idx_chatbot_msg_tpl_tenant ON public.chatbot_message_templates(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_message_templates TO authenticated;
GRANT ALL ON public.chatbot_message_templates TO service_role;
ALTER TABLE public.chatbot_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_tpl_select_same_tenant"
ON public.chatbot_message_templates FOR SELECT TO authenticated
USING (tenant_id = public.get_user_company_id(auth.uid()) OR public.is_master(auth.uid()));

CREATE POLICY "msg_tpl_write_admins"
ON public.chatbot_message_templates FOR ALL TO authenticated
USING (
  (tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)))
  OR public.is_master(auth.uid())
)
WITH CHECK (
  (tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)))
  OR public.is_master(auth.uid())
);

CREATE TRIGGER trg_msg_tpl_touch
BEFORE UPDATE ON public.chatbot_message_templates
FOR EACH ROW EXECUTE FUNCTION public.chatbot_touch_updated_at();

-- 3) chatbot_business_hours
CREATE TABLE public.chatbot_business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id uuid NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  -- Array of 7 objects, one per weekday (0=Sun..6=Sat), each:
  -- { enabled: bool, intervals: [{ start: "HH:MM", end: "HH:MM" }], all_day: bool }
  weekly_schedule jsonb NOT NULL DEFAULT '[
    {"enabled":false,"all_day":false,"intervals":[]},
    {"enabled":true,"all_day":false,"intervals":[{"start":"09:00","end":"18:00"}]},
    {"enabled":true,"all_day":false,"intervals":[{"start":"09:00","end":"18:00"}]},
    {"enabled":true,"all_day":false,"intervals":[{"start":"09:00","end":"18:00"}]},
    {"enabled":true,"all_day":false,"intervals":[{"start":"09:00","end":"18:00"}]},
    {"enabled":true,"all_day":false,"intervals":[{"start":"09:00","end":"18:00"}]},
    {"enabled":false,"all_day":false,"intervals":[]}
  ]'::jsonb,
  off_hours_behavior text NOT NULL DEFAULT 'ai_replies' CHECK (off_hours_behavior IN (
    'ai_replies','ai_simple_only','collect_data','inform_and_close','create_callback','forward_to_oncall','no_reply'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  UNIQUE (tenant_id, agent_id)
);
CREATE INDEX idx_chatbot_hours_tenant ON public.chatbot_business_hours(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_business_hours TO authenticated;
GRANT ALL ON public.chatbot_business_hours TO service_role;
ALTER TABLE public.chatbot_business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hours_select_same_tenant"
ON public.chatbot_business_hours FOR SELECT TO authenticated
USING (tenant_id = public.get_user_company_id(auth.uid()) OR public.is_master(auth.uid()));

CREATE POLICY "hours_write_admins"
ON public.chatbot_business_hours FOR ALL TO authenticated
USING (
  (tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)))
  OR public.is_master(auth.uid())
)
WITH CHECK (
  (tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)))
  OR public.is_master(auth.uid())
);

CREATE TRIGGER trg_hours_touch
BEFORE UPDATE ON public.chatbot_business_hours
FOR EACH ROW EXECUTE FUNCTION public.chatbot_touch_updated_at();

-- 4) chatbot_inactivity_rules
CREATE TABLE public.chatbot_inactivity_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id uuid NULL,

  first_warning_enabled boolean NOT NULL DEFAULT true,
  first_warning_after_minutes integer NOT NULL DEFAULT 10,
  first_warning_message text NOT NULL DEFAULT 'Olá! Você ainda está aí? Posso ajudar com mais alguma coisa?',

  second_warning_enabled boolean NOT NULL DEFAULT true,
  second_warning_after_minutes integer NOT NULL DEFAULT 20,
  second_warning_message text NOT NULL DEFAULT 'Como não tivemos retorno, seu atendimento será encerrado em breve.',

  auto_close_enabled boolean NOT NULL DEFAULT true,
  auto_close_after_minutes integer NOT NULL DEFAULT 45,
  close_message text NOT NULL DEFAULT 'Atendimento encerrado por inatividade. Se precisar, é só chamar novamente.',
  close_final_status text NOT NULL DEFAULT 'closed',
  close_tag text NULL,
  reopen_on_new_message boolean NOT NULL DEFAULT true,
  create_summary boolean NOT NULL DEFAULT true,
  create_followup_task boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  UNIQUE (tenant_id, agent_id)
);
CREATE INDEX idx_chatbot_inactivity_tenant ON public.chatbot_inactivity_rules(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_inactivity_rules TO authenticated;
GRANT ALL ON public.chatbot_inactivity_rules TO service_role;
ALTER TABLE public.chatbot_inactivity_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inact_select_same_tenant"
ON public.chatbot_inactivity_rules FOR SELECT TO authenticated
USING (tenant_id = public.get_user_company_id(auth.uid()) OR public.is_master(auth.uid()));

CREATE POLICY "inact_write_admins"
ON public.chatbot_inactivity_rules FOR ALL TO authenticated
USING (
  (tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)))
  OR public.is_master(auth.uid())
)
WITH CHECK (
  (tenant_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)))
  OR public.is_master(auth.uid())
);

CREATE TRIGGER trg_inact_touch
BEFORE UPDATE ON public.chatbot_inactivity_rules
FOR EACH ROW EXECUTE FUNCTION public.chatbot_touch_updated_at();
