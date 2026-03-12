CREATE POLICY "Users can update activities for their servidor"
ON public.crm_lead_activities
FOR UPDATE
TO authenticated
USING (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND (
      servidor_id = get_user_company_id(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = get_user_company_id(auth.uid())
          AND c.servidor_id = crm_lead_activities.servidor_id
      )
    )
  )
);