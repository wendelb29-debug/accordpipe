
-- Onda 6: enriquecer whatsapp_messages para persistência total do histórico WhatsApp

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS chat_id text,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'accord_api',
  ADD COLUMN IF NOT EXISTS media_mimetype text,
  ADD COLUMN IF NOT EXISTS media_download_status text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS transcription text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Relax NOT NULLs para permitir gravar evento antes de resolver contato
ALTER TABLE public.whatsapp_messages ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE public.whatsapp_messages ALTER COLUMN message DROP NOT NULL;

-- Constraint de valores válidos para origin e download_status (best effort)
DO $$ BEGIN
  ALTER TABLE public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_origin_check
    CHECK (origin IN ('accord_api','whatsapp_native','backfill'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_media_status_check
    CHECK (media_download_status IN ('pending','done','failed','not_applicable'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Índice único idempotente por (company_id, external_message_id)
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_tenant_external_uk
  ON public.whatsapp_messages (company_id, external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_messages_media_pending_idx
  ON public.whatsapp_messages (created_at)
  WHERE media_download_status IN ('pending','failed');

CREATE INDEX IF NOT EXISTS whatsapp_messages_chat_id_idx
  ON public.whatsapp_messages (company_id, chat_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_whatsapp_messages_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS tg_whatsapp_messages_touch ON public.whatsapp_messages;
CREATE TRIGGER tg_whatsapp_messages_touch
BEFORE UPDATE ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_whatsapp_messages_touch();
