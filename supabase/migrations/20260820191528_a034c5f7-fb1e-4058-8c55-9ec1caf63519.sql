DROP POLICY IF EXISTS "tenant members can view suppression" ON public.email_suppression_list;
CREATE POLICY "tenant members can view suppression"
ON public.email_suppression_list
FOR SELECT
TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid() AND ut.tenant_id = email_suppression_list.tenant_id
    )
  )
);

DROP POLICY IF EXISTS "Tenant users see only messages of their own contacts" ON public.whatsapp_messages;
CREATE POLICY "Tenant users see only messages of their own contacts"
ON public.whatsapp_messages
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND NOT public.has_role(auth.uid(), 'admin'::app_role)
  AND NOT public.has_role(auth.uid(), 'ceo'::app_role)
  AND NOT public.is_master(auth.uid())
  AND contact_id IN (
    SELECT c.id FROM public.whatsapp_contacts c
    WHERE c.assigned_to = auth.uid()
  )
);