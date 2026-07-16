
-- RLS policies for whatsapp-media bucket. Path convention: {tenant_id}/{filename}
DROP POLICY IF EXISTS "wa_media_select_tenant" ON storage.objects;
CREATE POLICY "wa_media_select_tenant" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND (
    public.is_master(auth.uid())
    OR (storage.foldername(name))[1]::uuid = public.get_user_company_id(auth.uid())
  )
);
