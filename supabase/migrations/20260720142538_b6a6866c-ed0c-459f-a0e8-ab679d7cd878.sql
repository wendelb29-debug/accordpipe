
-- Restrict billing/payment SELECT policies to finance/admin roles

-- master_billing_history
DROP POLICY IF EXISTS "Tenant users can view own billing" ON public.master_billing_history;
CREATE POLICY "Finance/admin can view own tenant billing"
ON public.master_billing_history
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'administrativo')
  )
);

-- tenant_asaas_payments
DROP POLICY IF EXISTS "Users can view own tenant payments" ON public.tenant_asaas_payments;
DROP POLICY IF EXISTS "Tenant users can view own payments" ON public.tenant_asaas_payments;
CREATE POLICY "Finance/admin can view own tenant payments"
ON public.tenant_asaas_payments
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'administrativo')
  )
);

-- tenant_asaas_customers
DROP POLICY IF EXISTS "Users can view own tenant customers" ON public.tenant_asaas_customers;
DROP POLICY IF EXISTS "Tenant users can view own customers" ON public.tenant_asaas_customers;
CREATE POLICY "Finance/admin can view own tenant customers"
ON public.tenant_asaas_customers
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'administrativo')
  )
);

-- tenant_asaas_subscriptions
DROP POLICY IF EXISTS "Users can view own tenant subscriptions" ON public.tenant_asaas_subscriptions;
DROP POLICY IF EXISTS "Tenant users can view own subscriptions" ON public.tenant_asaas_subscriptions;
CREATE POLICY "Finance/admin can view own tenant subscriptions"
ON public.tenant_asaas_subscriptions
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'administrativo')
  )
);
