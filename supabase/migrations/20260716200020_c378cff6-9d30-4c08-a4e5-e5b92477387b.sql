
CREATE POLICY "template_media_tenant_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'whatsapp-template-media'
    AND (
      public.is_master(auth.uid())
      OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    )
  );

CREATE POLICY "template_media_tenant_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'whatsapp-template-media'
    AND (
      public.is_master(auth.uid())
      OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    )
  );

CREATE POLICY "template_media_tenant_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'whatsapp-template-media'
    AND (
      public.is_master(auth.uid())
      OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    )
  );

CREATE POLICY "template_media_tenant_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'whatsapp-template-media'
    AND (
      public.is_master(auth.uid())
      OR (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    )
  );
