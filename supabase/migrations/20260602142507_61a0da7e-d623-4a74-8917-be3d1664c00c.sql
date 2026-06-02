
CREATE TABLE IF NOT EXISTS public.email_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id     uuid NOT NULL,
  user_id         uuid NOT NULL,
  provider        text NOT NULL,
  display_name    text NOT NULL,
  email_address   text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  status_message  text NULL,
  shared_sender   boolean NOT NULL DEFAULT false,
  sender_name     text NULL,
  daily_limit     integer NULL,
  import_since    text NOT NULL DEFAULT '1week',
  imap_config     jsonb NULL,
  oauth_tokens    jsonb NULL,
  crm_integration boolean NOT NULL DEFAULT false,
  calendar_integration boolean NOT NULL DEFAULT false,
  last_synced_at  timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (servidor_id, user_id, email_address)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_accounts TO authenticated;
GRANT ALL ON public.email_accounts TO service_role;

CREATE INDEX IF NOT EXISTS email_accounts_servidor_idx ON public.email_accounts(servidor_id);
CREATE INDEX IF NOT EXISTS email_accounts_user_idx     ON public.email_accounts(user_id);

CREATE OR REPLACE FUNCTION public.email_accounts_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_accounts_touch ON public.email_accounts;
CREATE TRIGGER email_accounts_touch
BEFORE UPDATE ON public.email_accounts
FOR EACH ROW
EXECUTE FUNCTION public.email_accounts_touch_updated_at();

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_accounts_select" ON public.email_accounts
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  AND servidor_id = public.get_user_company_id(auth.uid())
);

CREATE POLICY "email_accounts_insert" ON public.email_accounts
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND servidor_id = public.get_user_company_id(auth.uid())
);

CREATE POLICY "email_accounts_update" ON public.email_accounts
FOR UPDATE TO authenticated USING (
  user_id = auth.uid()
  AND servidor_id = public.get_user_company_id(auth.uid())
) WITH CHECK (
  user_id = auth.uid()
  AND servidor_id = public.get_user_company_id(auth.uid())
);

CREATE POLICY "email_accounts_delete" ON public.email_accounts
FOR DELETE TO authenticated USING (
  user_id = auth.uid()
  AND servidor_id = public.get_user_company_id(auth.uid())
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.email_accounts;
