-- 1) companies: remove remaining sensitive integration column from general read access
REVOKE SELECT (zapi_instance_id) ON public.companies FROM authenticated;
GRANT SELECT (zapi_instance_id) ON public.companies TO service_role;

-- 2) fintech_webhook_logs: restrict to finance/admin roles
DROP POLICY IF EXISTS "Users can view webhook logs of their company" ON public.fintech_webhook_logs;
CREATE POLICY "Finance and admins can view company webhook logs"
ON public.fintech_webhook_logs
FOR SELECT
TO authenticated
USING (
  servidor_id = public.get_user_company_id(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ceo'::public.app_role)
    OR public.has_role(auth.uid(), 'financeiro'::public.app_role)
    OR public.has_role(auth.uid(), 'administrativo'::public.app_role)
  )
);

-- 3) tenant_asaas_webhook_events: restrict to finance/admin roles
DROP POLICY IF EXISTS "Users can view own tenant webhook events" ON public.tenant_asaas_webhook_events;
CREATE POLICY "Finance and admins can view tenant webhook events"
ON public.tenant_asaas_webhook_events
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ceo'::public.app_role)
    OR public.has_role(auth.uid(), 'financeiro'::public.app_role)
    OR public.has_role(auth.uid(), 'administrativo'::public.app_role)
  )
);

-- 4) payments: restrict to finance/admin roles
DROP POLICY IF EXISTS "Users can view payments for their company" ON public.payments;
CREATE POLICY "Finance and admins can view company payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'ceo'::public.app_role)
      OR public.has_role(auth.uid(), 'financeiro'::public.app_role)
      OR public.has_role(auth.uid(), 'administrativo'::public.app_role)
    )
  )
);