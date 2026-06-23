
DROP POLICY IF EXISTS "Users can view ad_integrations for their servidor" ON public.ad_integrations;
CREATE POLICY "Admins can view ad_integrations for their servidor"
ON public.ad_integrations
FOR SELECT
USING (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
    AND servidor_id = get_user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view ad_lead_forms for their servidor" ON public.ad_lead_forms;
CREATE POLICY "Admins can view ad_lead_forms for their servidor"
ON public.ad_lead_forms
FOR SELECT
USING (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
    AND servidor_id = get_user_company_id(auth.uid())
  )
);
