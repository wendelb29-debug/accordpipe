DROP POLICY IF EXISTS twi_insert_same_tenant ON public.tenant_whatsapp_integrations;
DROP POLICY IF EXISTS twi_update_same_tenant ON public.tenant_whatsapp_integrations;
DROP POLICY IF EXISTS twi_delete_same_tenant ON public.tenant_whatsapp_integrations;

CREATE POLICY twi_insert_admin_only ON public.tenant_whatsapp_integrations
FOR INSERT TO authenticated
WITH CHECK (
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

CREATE POLICY twi_update_admin_only ON public.tenant_whatsapp_integrations
FOR UPDATE TO authenticated
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
)
WITH CHECK (
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

CREATE POLICY twi_delete_admin_only ON public.tenant_whatsapp_integrations
FOR DELETE TO authenticated
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