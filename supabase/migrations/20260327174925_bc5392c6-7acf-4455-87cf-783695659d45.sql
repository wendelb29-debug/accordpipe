DROP POLICY IF EXISTS "Users can insert activities for their servidor" ON public.crm_lead_activities;

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
      OR has_role(auth.uid(), 'ceo'::app_role)
      OR has_role(auth.uid(), 'comercial'::app_role)
      OR has_role(auth.uid(), 'administrativo'::app_role)
      OR has_role(auth.uid(), 'financeiro'::app_role)
    )
    AND (
      servidor_id = get_user_company_id(auth.uid())
      OR EXISTS (
        SELECT 1 FROM companies c
        WHERE c.id = get_user_company_id(auth.uid())
        AND c.servidor_id = crm_lead_activities.servidor_id
      )
    )
  )
);