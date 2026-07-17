-- Corrigir RLS de whatsapp_labels para permitir CEO e master
-- (hoje só admin/operador têm acesso)

DROP POLICY IF EXISTS "Admin/operador can manage labels" ON public.whatsapp_labels;

CREATE POLICY "Tenant members read labels"
ON public.whatsapp_labels
FOR SELECT
USING (
  is_master(auth.uid())
  OR company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Admins manage labels"
ON public.whatsapp_labels
FOR ALL
USING (
  is_master(auth.uid())
  OR (
    company_id = get_user_company_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'ceo'::app_role)
      OR has_role(auth.uid(), 'operador'::app_role)
    )
  )
)
WITH CHECK (
  is_master(auth.uid())
  OR (
    company_id = get_user_company_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'ceo'::app_role)
      OR has_role(auth.uid(), 'operador'::app_role)
    )
  )
);