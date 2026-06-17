
-- ============================================================
-- Security hardening: restrict sensitive credentials & realtime
-- ============================================================

-- 1) companies: revoke SELECT on sensitive credential columns from anon/authenticated.
--    These are read server-side via edge functions (zapi, whatsapp-webhook, etc.) using service_role.
REVOKE SELECT (zapi_token, zapi_client_token, zapi_instance_id, webhook_token)
  ON public.companies FROM anon, authenticated;

-- 2) tenant_whatsapp_integrations: restrict SELECT to admin/ceo/master roles.
DROP POLICY IF EXISTS "twi_select_same_tenant" ON public.tenant_whatsapp_integrations;
CREATE POLICY "twi_select_admin_only"
  ON public.tenant_whatsapp_integrations
  FOR SELECT
  TO authenticated
  USING (
    is_master(auth.uid())
    OR (
      tenant_id = get_user_company_id(auth.uid())
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'ceo'::app_role)
        OR has_role(auth.uid(), 'master'::app_role)
      )
    )
  );

-- 3) fintech_integrations: restrict SELECT to admin/ceo/master/financeiro roles.
DROP POLICY IF EXISTS "Users can view integrations of their company" ON public.fintech_integrations;
CREATE POLICY "Admins can view integrations of their company"
  ON public.fintech_integrations
  FOR SELECT
  TO authenticated
  USING (
    is_master(auth.uid())
    OR (
      servidor_id = get_user_company_id(auth.uid())
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'ceo'::app_role)
        OR has_role(auth.uid(), 'master'::app_role)
        OR has_role(auth.uid(), 'financeiro'::app_role)
      )
    )
  );

-- 4) digital-certificates storage bucket: require CEO/master in addition to tenant path.
DROP POLICY IF EXISTS "Tenant masters can read own digital certificates" ON storage.objects;
CREATE POLICY "CEO or master can read own digital certificates"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'digital-certificates'
    AND (
      is_master(auth.uid())
      OR (
        (storage.foldername(name))[1] = (get_user_company_id(auth.uid()))::text
        AND (
          has_role(auth.uid(), 'ceo'::app_role)
          OR has_role(auth.uid(), 'master'::app_role)
        )
      )
    )
  );

-- 5) realtime.messages: remove the broad 'notifications'/'public_feed' literals so a tenant
--    user cannot inject broadcast payloads across all tenants. Keep uid-scoped topics only.
DROP POLICY IF EXISTS "Authenticated can send to own channels" ON realtime.messages;
CREATE POLICY "Authenticated can send to own channels"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (topic LIKE ('%' || (auth.uid())::text || '%'));
