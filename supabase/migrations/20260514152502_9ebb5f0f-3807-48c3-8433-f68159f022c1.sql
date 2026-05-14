
-- Isolar conversas/mensagens do WhatsApp por usuário (exceto admin/CEO/master)

-- whatsapp_contacts: substituir política específica de operador por uma genérica
DROP POLICY IF EXISTS "Operador can view own contacts" ON public.whatsapp_contacts;

CREATE POLICY "Tenant users see only their own contacts"
ON public.whatsapp_contacts
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND NOT public.has_role(auth.uid(), 'admin'::app_role)
  AND NOT public.has_role(auth.uid(), 'ceo'::app_role)
  AND NOT public.is_master(auth.uid())
  AND (assigned_to = auth.uid() OR assigned_to IS NULL)
);

-- Permitir que qualquer usuário do tenant assuma um contato não atribuído ou atualize o seu
DROP POLICY IF EXISTS "Admin/operador can update tenant contacts" ON public.whatsapp_contacts;

CREATE POLICY "Tenant members can update permitted contacts"
ON public.whatsapp_contacts
FOR UPDATE
TO authenticated
USING (
  public.is_master(auth.uid())
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'ceo'::app_role)
      OR assigned_to = auth.uid()
      OR assigned_to IS NULL
    )
  )
);

-- whatsapp_messages: substituir política específica de operador por uma genérica
DROP POLICY IF EXISTS "Operador can view own messages" ON public.whatsapp_messages;

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
    SELECT id FROM public.whatsapp_contacts
    WHERE assigned_to = auth.uid() OR assigned_to IS NULL
  )
);
