DROP POLICY IF EXISTS "Collab avatars are viewable by authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload collab avatars" ON storage.objects;

CREATE POLICY "Collab avatars viewable by same-tenant members"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'collab-avatars'
  AND EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.status = 'ativo'
      AND ut.tenant_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Collab avatars insert restricted to own tenant"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'collab-avatars'
  AND owner = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.status = 'ativo'
      AND ut.tenant_id::text = (storage.foldername(name))[1]
  )
);