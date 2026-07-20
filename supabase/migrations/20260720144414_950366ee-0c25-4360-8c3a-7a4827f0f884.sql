
CREATE POLICY "Tenant members can read brand logos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'brand-logos'
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    JOIN public.user_tenants ut ON ut.tenant_id = c.id
    WHERE c.brand_logo_path = storage.objects.name
      AND ut.user_id = auth.uid()
      AND ut.status = 'active'
  )
);
