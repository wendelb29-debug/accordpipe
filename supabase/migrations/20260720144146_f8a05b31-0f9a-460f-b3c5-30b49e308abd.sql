
-- Restrict ad_integrations writes to admin/ceo only (remove operador)
DROP POLICY IF EXISTS "Admin/operador can insert ad_integrations" ON public.ad_integrations;
DROP POLICY IF EXISTS "Admin/operador can update ad_integrations" ON public.ad_integrations;
DROP POLICY IF EXISTS "Admin/operador can delete ad_integrations" ON public.ad_integrations;

CREATE POLICY "Admins can insert ad_integrations"
  ON public.ad_integrations FOR INSERT TO authenticated
  WITH CHECK (
    is_master(auth.uid())
    OR ((has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
        AND servidor_id = get_user_company_id(auth.uid()))
  );

CREATE POLICY "Admins can update ad_integrations"
  ON public.ad_integrations FOR UPDATE TO authenticated
  USING (
    is_master(auth.uid())
    OR ((has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
        AND servidor_id = get_user_company_id(auth.uid()))
  )
  WITH CHECK (
    is_master(auth.uid())
    OR ((has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
        AND servidor_id = get_user_company_id(auth.uid()))
  );

CREATE POLICY "Admins can delete ad_integrations"
  ON public.ad_integrations FOR DELETE TO authenticated
  USING (
    is_master(auth.uid())
    OR ((has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
        AND servidor_id = get_user_company_id(auth.uid()))
  );

-- Restrict tenant_asaas_customers writes to finance/admin roles
DROP POLICY IF EXISTS "Users can insert own tenant asaas customers" ON public.tenant_asaas_customers;
DROP POLICY IF EXISTS "Users can update own tenant asaas customers" ON public.tenant_asaas_customers;

CREATE POLICY "Finance/admin can insert own tenant customers"
  ON public.tenant_asaas_customers FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_company_id(auth.uid())
    AND (
      has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'ceo'::app_role)
      OR has_role(auth.uid(),'financeiro'::app_role)
      OR has_role(auth.uid(),'administrativo'::app_role)
    )
  );

CREATE POLICY "Finance/admin can update own tenant customers"
  ON public.tenant_asaas_customers FOR UPDATE TO authenticated
  USING (
    tenant_id = get_user_company_id(auth.uid())
    AND (
      has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'ceo'::app_role)
      OR has_role(auth.uid(),'financeiro'::app_role)
      OR has_role(auth.uid(),'administrativo'::app_role)
    )
  )
  WITH CHECK (
    tenant_id = get_user_company_id(auth.uid())
    AND (
      has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'ceo'::app_role)
      OR has_role(auth.uid(),'financeiro'::app_role)
      OR has_role(auth.uid(),'administrativo'::app_role)
    )
  );

-- Restrict tenant_asaas_payments writes to finance/admin roles
DROP POLICY IF EXISTS "Users can insert own tenant asaas payments" ON public.tenant_asaas_payments;
DROP POLICY IF EXISTS "Users can update own tenant asaas payments" ON public.tenant_asaas_payments;

CREATE POLICY "Finance/admin can insert own tenant payments"
  ON public.tenant_asaas_payments FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_company_id(auth.uid())
    AND (
      has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'ceo'::app_role)
      OR has_role(auth.uid(),'financeiro'::app_role)
      OR has_role(auth.uid(),'administrativo'::app_role)
    )
  );

CREATE POLICY "Finance/admin can update own tenant payments"
  ON public.tenant_asaas_payments FOR UPDATE TO authenticated
  USING (
    tenant_id = get_user_company_id(auth.uid())
    AND (
      has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'ceo'::app_role)
      OR has_role(auth.uid(),'financeiro'::app_role)
      OR has_role(auth.uid(),'administrativo'::app_role)
    )
  )
  WITH CHECK (
    tenant_id = get_user_company_id(auth.uid())
    AND (
      has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'ceo'::app_role)
      OR has_role(auth.uid(),'financeiro'::app_role)
      OR has_role(auth.uid(),'administrativo'::app_role)
    )
  );
