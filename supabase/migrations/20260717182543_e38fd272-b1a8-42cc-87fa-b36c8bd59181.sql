-- 1) Normalize legacy message_type values ("imageMessage" -> "image")
UPDATE public.whatsapp_messages
SET message_type = regexp_replace(lower(message_type), 'message$', '')
WHERE message_type ~* 'message$'
  AND lower(message_type) <> 'extendedtextmessage';

UPDATE public.whatsapp_messages
SET message_type = 'text'
WHERE lower(message_type) IN ('extendedtextmessage', 'conversation');

-- 2) Clean raw payload leaks + queue for retry download.
--    Only rows that look like a JSON payload and are media types missing the file.
WITH media_types AS (
  SELECT unnest(ARRAY[
    'image','sticker','video','videoplay','audio','myaudio','ptt','ptv','document','file','pdf'
  ]) AS t
)
UPDATE public.whatsapp_messages m
SET
  message = NULL,
  media_download_status = 'pending'
WHERE m.media_url IS NULL
  AND lower(m.message_type) IN (SELECT t FROM media_types)
  AND m.message IS NOT NULL
  AND (
    m.message LIKE '{%'
    OR m.message ILIKE '%"mediaKey"%'
    OR m.message ILIKE '%"directPath"%'
    OR m.message ILIKE '%"fileSHA256"%'
    OR m.message ILIKE '%"URL"%'
    OR m.message ILIKE '%"mimetype"%'
  );
