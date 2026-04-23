
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS external_message_id text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_external_id
  ON public.whatsapp_messages(company_id, external_message_id)
  WHERE external_message_id IS NOT NULL;

ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS avatar_synced_at timestamptz;

ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
