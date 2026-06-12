ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS is_starred    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_important  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz,
  ADD COLUMN IF NOT EXISTS raw_headers   jsonb,
  ADD COLUMN IF NOT EXISTS raw_eml_path  text;

CREATE INDEX IF NOT EXISTS idx_email_messages_starred
  ON public.email_messages (account_id, is_starred)
  WHERE is_starred = true;

CREATE INDEX IF NOT EXISTS idx_email_messages_snoozed
  ON public.email_messages (account_id, snoozed_until)
  WHERE snoozed_until IS NOT NULL;