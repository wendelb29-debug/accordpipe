-- 1. ad_integrations: hide plaintext tokens from all client roles
REVOKE SELECT (system_user_token, page_access_token, google_webhook_key) ON public.ad_integrations FROM authenticated, anon;
REVOKE UPDATE (system_user_token, page_access_token, google_webhook_key) ON public.ad_integrations FROM authenticated, anon;
REVOKE INSERT (system_user_token, page_access_token, google_webhook_key) ON public.ad_integrations FROM authenticated, anon;
GRANT ALL ON public.ad_integrations TO service_role;

-- fintech_integrations: encrypted credential columns never readable by clients (masked columns remain)
REVOKE SELECT (api_key_encrypted, webhook_secret_encrypted, client_secret_encrypted, origin_key_encrypted) ON public.fintech_integrations FROM authenticated, anon;
REVOKE UPDATE (api_key_encrypted, webhook_secret_encrypted, client_secret_encrypted, origin_key_encrypted) ON public.fintech_integrations FROM authenticated, anon;
REVOKE INSERT (api_key_encrypted, webhook_secret_encrypted, client_secret_encrypted, origin_key_encrypted) ON public.fintech_integrations FROM authenticated, anon;
GRANT ALL ON public.fintech_integrations TO service_role;

-- 2. user_roles: close fail-open restrictive UPDATE policy and add WITH CHECK on permissive policies
DROP POLICY IF EXISTS "Only master can update to master or ceo" ON public.user_roles;
CREATE POLICY "Only master can update to master or ceo"
ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
USING ((role <> ALL (ARRAY['master'::app_role, 'ceo'::app_role])) OR public.is_master(auth.uid()))
WITH CHECK ((role <> ALL (ARRAY['master'::app_role, 'ceo'::app_role])) OR public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Admins can update roles in their company" ON public.user_roles;
CREATE POLICY "Admins can update roles in their company"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  public.is_master(auth.uid()) OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
    AND public.get_profile_company_id(user_id) = public.get_user_company_id(auth.uid())
    AND NOT public.is_master(user_id)
  )
)
WITH CHECK (
  public.is_master(auth.uid()) OR (
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
    AND public.get_profile_company_id(user_id) = public.get_user_company_id(auth.uid())
    AND role <> ALL (ARRAY['master'::app_role, 'ceo'::app_role])
  )
);

DROP POLICY IF EXISTS "Resellers can update child tenant user roles" ON public.user_roles;

-- 3. whatsapp_messages: admin/ceo read requires active membership in the same tenant
DROP POLICY IF EXISTS "Admin can view tenant messages" ON public.whatsapp_messages;
CREATE POLICY "Admin can view tenant messages"
ON public.whatsapp_messages FOR SELECT TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role))
  AND company_id = public.get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = whatsapp_messages.company_id
      AND COALESCE(ut.status, 'active') = 'active'
  )
);

-- 4. whatsapp_presence: single source of tenant resolution
DROP POLICY IF EXISTS "Tenant members can view presence" ON public.whatsapp_presence;
CREATE POLICY "Tenant members can view presence"
ON public.whatsapp_presence FOR SELECT TO authenticated
USING (tenant_id = public.get_user_company_id(auth.uid()));