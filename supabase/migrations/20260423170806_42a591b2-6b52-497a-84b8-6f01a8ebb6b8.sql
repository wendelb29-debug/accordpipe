
-- Step 1: Delete older duplicates per (company_id, external_message_id), keeping the most recent
DELETE FROM public.whatsapp_messages a
USING public.whatsapp_messages b
WHERE a.company_id = b.company_id
  AND a.external_message_id = b.external_message_id
  AND a.external_message_id IS NOT NULL
  AND a.created_at < b.created_at;

-- Step 2: Add a unique index so the database enforces dedup at insert time
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_company_external_id_unique
  ON public.whatsapp_messages (company_id, external_message_id)
  WHERE external_message_id IS NOT NULL;
