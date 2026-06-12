-- Storage policies for audit-exports bucket
DROP POLICY IF EXISTS "gestao_can_read_audit_exports" ON storage.objects;
CREATE POLICY "gestao_can_read_audit_exports" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'audit-exports'
  AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_master = true)
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin'::app_role, 'ceo'::app_role, 'master'::app_role)
    )
  )
);

-- Insert: authenticated user can upload only into their own tenant folder
DROP POLICY IF EXISTS "user_can_insert_own_audit_export" ON storage.objects;
CREATE POLICY "user_can_insert_own_audit_export" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audit-exports'
  AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);

-- No update / delete from clients
DROP POLICY IF EXISTS "audit_exports_no_update" ON storage.objects;
CREATE POLICY "audit_exports_no_update" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id <> 'audit-exports');

DROP POLICY IF EXISTS "audit_exports_no_delete" ON storage.objects;
CREATE POLICY "audit_exports_no_delete" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id <> 'audit-exports');
