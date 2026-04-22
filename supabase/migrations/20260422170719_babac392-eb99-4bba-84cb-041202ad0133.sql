-- Merge duplicate WhatsApp contacts
-- Strategy: group by (company_id, last 11 digits of phone), keep the OLDEST contact,
-- repoint whatsapp_messages.contact_id and crm_leads via whatsapp_contacts.lead_id, then delete duplicates.

DO $$
DECLARE
  rec RECORD;
  keeper_id uuid;
  keeper_phone text;
  keeper_lead_id uuid;
  dup_ids uuid[];
BEGIN
  FOR rec IN
    SELECT
      company_id,
      RIGHT(regexp_replace(phone, '\D', '', 'g'), 11) AS suffix,
      COUNT(*) AS cnt
    FROM public.whatsapp_contacts
    WHERE phone IS NOT NULL
      AND length(regexp_replace(phone, '\D', '', 'g')) >= 10
    GROUP BY 1, 2
    HAVING COUNT(*) > 1
  LOOP
    -- Pick keeper: oldest contact for this group, prefer one with lead_id set
    SELECT id, phone, lead_id
      INTO keeper_id, keeper_phone, keeper_lead_id
    FROM public.whatsapp_contacts
    WHERE company_id = rec.company_id
      AND RIGHT(regexp_replace(phone, '\D', '', 'g'), 11) = rec.suffix
    ORDER BY (lead_id IS NULL), created_at ASC
    LIMIT 1;

    -- Collect duplicate ids (everything except keeper)
    SELECT array_agg(id)
      INTO dup_ids
    FROM public.whatsapp_contacts
    WHERE company_id = rec.company_id
      AND RIGHT(regexp_replace(phone, '\D', '', 'g'), 11) = rec.suffix
      AND id <> keeper_id;

    IF dup_ids IS NULL OR array_length(dup_ids, 1) = 0 THEN
      CONTINUE;
    END IF;

    -- Repoint messages
    UPDATE public.whatsapp_messages
    SET contact_id = keeper_id
    WHERE contact_id = ANY(dup_ids);

    -- If keeper has no lead, but a duplicate has one, adopt it before deleting
    IF keeper_lead_id IS NULL THEN
      UPDATE public.whatsapp_contacts k
      SET lead_id = sub.lead_id
      FROM (
        SELECT lead_id FROM public.whatsapp_contacts
        WHERE id = ANY(dup_ids) AND lead_id IS NOT NULL
        ORDER BY created_at ASC LIMIT 1
      ) sub
      WHERE k.id = keeper_id AND sub.lead_id IS NOT NULL;
    END IF;

    -- Normalize keeper phone to 55 + suffix (primaryPhone format)
    UPDATE public.whatsapp_contacts
    SET phone = '55' || rec.suffix
    WHERE id = keeper_id;

    -- Delete duplicates
    DELETE FROM public.whatsapp_contacts WHERE id = ANY(dup_ids);
  END LOOP;
END $$;

-- Add a unique index to prevent future duplicates by (company_id, normalized 11-digit suffix)
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_contacts_company_phone_suffix_uniq
ON public.whatsapp_contacts (
  company_id,
  (RIGHT(regexp_replace(phone, '\D', '', 'g'), 11))
)
WHERE phone IS NOT NULL AND length(regexp_replace(phone, '\D', '', 'g')) >= 10;