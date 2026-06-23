CREATE TABLE IF NOT EXISTS public.activity_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.crm_lead_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  servidor_id uuid NOT NULL,
  reminder_minutes integer NOT NULL,
  reminder_scheduled_at timestamptz NOT NULL,
  notify_system boolean NOT NULL DEFAULT true,
  notify_email boolean NOT NULL DEFAULT false,
  system_sent_at timestamptz,
  email_sent_at timestamptz,
  email_error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_reminders TO authenticated;
GRANT ALL ON public.activity_reminders TO service_role;

ALTER TABLE public.activity_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reminders"
  ON public.activity_reminders FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own reminders"
  ON public.activity_reminders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND servidor_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users update own reminders"
  ON public.activity_reminders FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own reminders"
  ON public.activity_reminders FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_activity_reminders_pending
  ON public.activity_reminders (reminder_scheduled_at)
  WHERE system_sent_at IS NULL OR email_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_activity_reminders_user
  ON public.activity_reminders (user_id, reminder_scheduled_at);

CREATE OR REPLACE FUNCTION public.tg_activity_reminders_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_activity_reminders_updated_at
  BEFORE UPDATE ON public.activity_reminders
  FOR EACH ROW EXECUTE FUNCTION public.tg_activity_reminders_touch();