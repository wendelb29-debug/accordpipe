-- Extensão necessária pra criptografia de tokens
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Estende email_accounts com campos OAuth
ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS oauth_provider_user_id text,
  ADD COLUMN IF NOT EXISTS oauth_scopes text,
  ADD COLUMN IF NOT EXISTS last_history_id text;

-- Tabela de mensagens sincronizadas
CREATE TABLE IF NOT EXISTS public.email_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id     uuid NOT NULL,
  account_id      uuid NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  provider_msg_id text NOT NULL,
  thread_id       text NULL,
  folder          text NOT NULL DEFAULT 'INBOX',
  subject         text NULL,
  from_email      text NULL,
  from_name       text NULL,
  to_emails       jsonb NULL,
  cc_emails       jsonb NULL,
  bcc_emails      jsonb NULL,
  snippet         text NULL,
  body_text       text NULL,
  body_html       text NULL,
  is_read         boolean NOT NULL DEFAULT false,
  is_starred      boolean NOT NULL DEFAULT false,
  labels          jsonb NULL,
  has_attachments boolean NOT NULL DEFAULT false,
  attachments     jsonb NULL,
  received_at     timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, provider_msg_id)
);

-- Grants obrigatórios (Data API)
GRANT SELECT, UPDATE, DELETE ON public.email_messages TO authenticated;
GRANT ALL ON public.email_messages TO service_role;

-- Índices de performance
CREATE INDEX IF NOT EXISTS email_messages_account_idx     ON public.email_messages(account_id);
CREATE INDEX IF NOT EXISTS email_messages_received_at_idx ON public.email_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS email_messages_folder_idx      ON public.email_messages(account_id, folder);
CREATE INDEX IF NOT EXISTS email_messages_thread_idx      ON public.email_messages(thread_id);

-- RLS
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_messages_select" ON public.email_messages;
CREATE POLICY "email_messages_select" ON public.email_messages
FOR SELECT TO authenticated USING (
  account_id IN (SELECT id FROM public.email_accounts WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "email_messages_update" ON public.email_messages;
CREATE POLICY "email_messages_update" ON public.email_messages
FOR UPDATE TO authenticated USING (
  account_id IN (SELECT id FROM public.email_accounts WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "email_messages_delete" ON public.email_messages;
CREATE POLICY "email_messages_delete" ON public.email_messages
FOR DELETE TO authenticated USING (
  account_id IN (SELECT id FROM public.email_accounts WHERE user_id = auth.uid())
);

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;