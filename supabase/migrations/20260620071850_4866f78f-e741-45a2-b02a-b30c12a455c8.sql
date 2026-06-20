-- 1) documents bucket: tenant-scoped SELECT (still allow shared 'avatars' folder + master)
DROP POLICY IF EXISTS "Authenticated users can view document files" ON storage.objects;

CREATE POLICY "Authenticated users can view document files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    is_master(auth.uid())
    OR (storage.foldername(name))[1] = 'avatars'
    OR (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
  )
);

-- 2) audit-exports: only admin/ceo/master may insert, mirroring the SELECT policy
DROP POLICY IF EXISTS "user_can_insert_own_audit_export" ON storage.objects;

CREATE POLICY "gestao_can_insert_audit_exports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audit-exports'
  AND (
    is_master(auth.uid())
    OR (
      (has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'ceo'::app_role)
        OR has_role(auth.uid(), 'master'::app_role))
      AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
    )
  )
);