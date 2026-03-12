-- Ajusta políticas de atividades do CRM para permitir criação de propostas por usuários leitura
-- mantendo isolamento por servidor/tenant

DROP POLICY IF EXISTS "Admin/operador can insert activities" ON public.crm_lead_activities;
CREATE POLICY "Users can insert activities for their servidor"
ON public.crm_lead_activities
FOR INSERT
TO authenticated
WITH CHECK (
  is_master(auth.uid())
  OR (
    (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'operador'::app_role)
      OR has_role(auth.uid(), 'leitura'::app_role)
    )
    AND (
      servidor_id = get_user_company_id(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.companies c
        WHERE c.id = get_user_company_id(auth.uid())
          AND c.servidor_id = crm_lead_activities.servidor_id
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can view activities for their servidor" ON public.crm_lead_activities;
CREATE POLICY "Users can view activities for their servidor"
ON public.crm_lead_activities
FOR SELECT
TO authenticated
USING (
  is_master(auth.uid())
  OR servidor_id = get_user_company_id(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = get_user_company_id(auth.uid())
      AND c.servidor_id = crm_lead_activities.servidor_id
  )
);