-- Drop existing public SELECT policies on whatsapp-media
DROP POLICY IF EXISTS "Public select for whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "WhatsApp media public read" ON storage.objects;

-- Tenant-scoped SELECT policy for authenticated users
-- Inbound paths: inbound/{company_id}/{file}
-- Outbound paths: {company_id}/{file}
DROP POLICY IF EXISTS "WhatsApp media tenant-scoped read" ON storage.objects;
CREATE POLICY "WhatsApp media tenant-scoped read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND (
    (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    OR (
      (storage.foldername(name))[1] = 'inbound'
      AND (storage.foldername(name))[2] = public.get_user_company_id(auth.uid())::text
    )
  )
);