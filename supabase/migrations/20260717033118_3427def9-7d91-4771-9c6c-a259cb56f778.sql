DROP POLICY IF EXISTS "Authenticated users can view document files" ON storage.objects;

CREATE POLICY "Authenticated users can view document files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    is_master(auth.uid())
    OR (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  )
);