-- 1) audit-exports bucket SELECT: restrict to caller's tenant folder
DROP POLICY IF EXISTS "gestao_can_read_audit_exports" ON storage.objects;
CREATE POLICY "gestao_can_read_audit_exports"
ON storage.objects FOR SELECT
USING (
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

-- 2) documents bucket INSERT: enforce tenant-scoped path prefix
DROP POLICY IF EXISTS "Admin/operador can upload document files" ON storage.objects;
CREATE POLICY "Admin/operador can upload document files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (
    is_master(auth.uid())
    OR (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
      AND (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
    )
  )
);

-- 3) user_custom_permissions SELECT: scope admin/ceo reads to same tenant
DROP POLICY IF EXISTS "Users can view own custom_permissions" ON public.user_custom_permissions;
CREATE POLICY "Users can view own custom_permissions"
ON public.user_custom_permissions FOR SELECT
USING (
  user_id = auth.uid()
  OR is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
    AND get_profile_company_id(user_id) = get_user_company_id(auth.uid())
  )
);