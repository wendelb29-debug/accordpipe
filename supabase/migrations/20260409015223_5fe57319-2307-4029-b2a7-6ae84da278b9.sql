
-- Drop existing policies
DROP POLICY IF EXISTS "Admin/operador can insert leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Admin/operador can update leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Admin/operador can delete leads" ON public.crm_leads;

-- Recreate with all CRM-relevant roles
CREATE POLICY "CRM users can insert leads" ON public.crm_leads
FOR INSERT TO authenticated
WITH CHECK (
  is_master(auth.uid()) OR (
    (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'operador'::app_role) OR
      has_role(auth.uid(), 'ceo'::app_role) OR
      has_role(auth.uid(), 'comercial'::app_role)
    ) AND servidor_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "CRM users can update leads" ON public.crm_leads
FOR UPDATE TO authenticated
USING (
  is_master(auth.uid()) OR (
    (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'operador'::app_role) OR
      has_role(auth.uid(), 'ceo'::app_role) OR
      has_role(auth.uid(), 'comercial'::app_role)
    ) AND servidor_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "CRM users can delete leads" ON public.crm_leads
FOR DELETE TO authenticated
USING (
  is_master(auth.uid()) OR (
    (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'operador'::app_role) OR
      has_role(auth.uid(), 'ceo'::app_role) OR
      has_role(auth.uid(), 'comercial'::app_role)
    ) AND servidor_id = get_user_company_id(auth.uid())
  )
);
