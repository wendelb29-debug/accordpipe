
DROP POLICY IF EXISTS "Master users can manage billing history" ON public.master_billing_history;
DROP POLICY IF EXISTS "Master users can view all billing history" ON public.master_billing_history;

CREATE POLICY "Platform master manages billing history"
ON public.master_billing_history FOR ALL TO authenticated
USING (is_master(auth.uid())) WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Platform master views all billing history"
ON public.master_billing_history FOR SELECT TO authenticated
USING (is_master(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can insert subscription history" ON public.tenant_subscription_history;
DROP POLICY IF EXISTS "Platform admins can view subscription history" ON public.tenant_subscription_history;

CREATE POLICY "Platform master can insert subscription history"
ON public.tenant_subscription_history FOR INSERT TO authenticated
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Platform master or own tenant view subscription history"
ON public.tenant_subscription_history FOR SELECT TO authenticated
USING (is_master(auth.uid()) OR tenant_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "CEO/master can view all subscriptions" ON public.tenant_subscriptions;
DROP POLICY IF EXISTS "CEO/master can insert subscriptions" ON public.tenant_subscriptions;
DROP POLICY IF EXISTS "CEO/master can update subscriptions" ON public.tenant_subscriptions;
DROP POLICY IF EXISTS "CEO/master can delete subscriptions" ON public.tenant_subscriptions;

CREATE POLICY "Platform master or own tenant view subscriptions"
ON public.tenant_subscriptions FOR SELECT TO authenticated
USING (is_master(auth.uid()) OR tenant_id = get_user_company_id(auth.uid()));

CREATE POLICY "Platform master insert subscriptions"
ON public.tenant_subscriptions FOR INSERT TO authenticated
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Platform master update subscriptions"
ON public.tenant_subscriptions FOR UPDATE TO authenticated
USING (is_master(auth.uid())) WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Platform master delete subscriptions"
ON public.tenant_subscriptions FOR DELETE TO authenticated
USING (is_master(auth.uid()));

REVOKE SELECT (zapi_token, zapi_client_token, zapi_instance_id, webhook_token)
  ON public.companies FROM authenticated, anon;

REVOKE SELECT (page_access_token, system_user_token, google_webhook_key)
  ON public.ad_integrations FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_ad_integration_secrets(_integration_id uuid)
RETURNS TABLE(page_access_token text, system_user_token text, google_webhook_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ai.page_access_token, ai.system_user_token, ai.google_webhook_key
  FROM public.ad_integrations ai
  WHERE ai.id = _integration_id
    AND (
      is_master(auth.uid())
      OR (
        ai.servidor_id = get_user_company_id(auth.uid())
        AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_ad_integration_secrets(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ad_integration_secrets(uuid) TO authenticated;

REVOKE SELECT (api_key_encrypted, client_secret_encrypted, webhook_secret_encrypted)
  ON public.fintech_integrations FROM authenticated, anon;

REVOKE SELECT (api_key_encrypted, webhook_auth_token)
  ON public.tenant_fintech_integrations FROM authenticated, anon;

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Users insert audit logs for own tenant only"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    servidor_id IS NULL
    OR servidor_id = get_user_company_id(auth.uid())
    OR is_master(auth.uid())
  )
);
