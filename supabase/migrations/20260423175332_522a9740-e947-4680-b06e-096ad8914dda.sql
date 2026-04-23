
-- Add reply and reactions support to WhatsApp messages
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid NULL REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_reply_to
  ON public.whatsapp_messages(reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;
