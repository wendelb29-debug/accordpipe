
-- 1) Storage: collab-avatars INSERT must be owner-scoped
DROP POLICY IF EXISTS "Authenticated users can upload collab avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload collab avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'collab-avatars' AND owner = auth.uid());

-- 2) Storage: signatures INSERT must be path-scoped to auth.uid()
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
CREATE POLICY "Authenticated users can upload signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 3) Storage: user-signatures INSERT must be path-scoped
DROP POLICY IF EXISTS "Allow authenticated uploads to user-signatures" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to user-signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-signatures'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 4) documents INSERT requires same-tenant company_id
DROP POLICY IF EXISTS "Admin/operador can insert documents" ON public.documents;
CREATE POLICY "Admin/operador can insert documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
  AND company_id = public.get_user_company_id(auth.uid())
);

-- 5) user_tenants write policies must be scoped to the actor's tenant (master keeps wide access)
DROP POLICY IF EXISTS "Admins can insert tenant links" ON public.user_tenants;
CREATE POLICY "Admins can insert tenant links"
ON public.user_tenants FOR INSERT TO authenticated
WITH CHECK (
  public.is_master(auth.uid())
  OR (
    public.has_permission(auth.uid(), 'create_user'::text)
    AND tenant_id = public.get_user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can update tenant links" ON public.user_tenants;
CREATE POLICY "Admins can update tenant links"
ON public.user_tenants FOR UPDATE TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    public.has_permission(auth.uid(), 'edit_user'::text)
    AND tenant_id = public.get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  public.is_master(auth.uid())
  OR (
    public.has_permission(auth.uid(), 'edit_user'::text)
    AND tenant_id = public.get_user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Admins can delete tenant links" ON public.user_tenants;
CREATE POLICY "Admins can delete tenant links"
ON public.user_tenants FOR DELETE TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    public.has_permission(auth.uid(), 'edit_user'::text)
    AND tenant_id = public.get_user_company_id(auth.uid())
  )
);

-- 6) Hide sensitive credential columns from regular client reads.
--    Access continues via SECURITY DEFINER helpers (get_company_credentials,
--    get_whatsapp_instance_token) and via service_role from edge functions.
REVOKE SELECT (zapi_token, zapi_client_token, zapi_instance_id, webhook_token)
  ON public.companies FROM anon, authenticated;

REVOKE SELECT (
  api_key_encrypted, api_key_masked,
  webhook_secret_encrypted, webhook_secret_masked,
  client_secret_encrypted, client_secret_masked,
  origin_key_encrypted, origin_key_masked
) ON public.fintech_integrations FROM anon, authenticated;

REVOKE SELECT (instance_token)
  ON public.tenant_whatsapp_integrations FROM anon, authenticated;
