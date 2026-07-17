-- Onda 21: persist per-contact unread count for the inbox

ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0;

-- Atomic increment helper (avoids read-modify-write races when webhook fires bursts)
CREATE OR REPLACE FUNCTION public.increment_contact_unread(_contact_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.whatsapp_contacts
     SET unread_count = COALESCE(unread_count, 0) + 1,
         updated_at = now()
   WHERE id = _contact_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_contact_unread(uuid) TO service_role;