DROP POLICY IF EXISTS "Tenant members can view their whatsapp instance" ON public.whatsapp_instances;

CREATE POLICY "Tenant admins can view their whatsapp instance"
ON public.whatsapp_instances
FOR SELECT
TO authenticated
USING (
  (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = whatsapp_instances.tenant_id
        AND ut.status = 'active'
        AND ut.role IN ('admin','ceo')
    )
  )
  OR public.has_role(auth.uid(), 'master'::app_role)
);