
DROP POLICY IF EXISTS "Master users can view all tenant clients" ON public.master_tenant_clients;
DROP POLICY IF EXISTS "Master users can manage tenant clients" ON public.master_tenant_clients;

CREATE POLICY "Platform master can view all tenant clients"
ON public.master_tenant_clients
FOR SELECT
TO authenticated
USING (
  public.is_master(auth.uid())
  AND public.is_active_master_tenant(public.get_user_company_id(auth.uid()))
);

CREATE POLICY "Platform master can manage tenant clients"
ON public.master_tenant_clients
FOR ALL
TO authenticated
USING (
  public.is_master(auth.uid())
  AND public.is_active_master_tenant(public.get_user_company_id(auth.uid()))
)
WITH CHECK (
  public.is_master(auth.uid())
  AND public.is_active_master_tenant(public.get_user_company_id(auth.uid()))
);

CREATE POLICY "Tenant admins can view own tenant client record"
ON public.master_tenant_clients
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'financeiro'::app_role)
  )
);
