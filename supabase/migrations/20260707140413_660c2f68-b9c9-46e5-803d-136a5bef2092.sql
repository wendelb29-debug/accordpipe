
-- proposals
DROP POLICY IF EXISTS "Users can manage proposals of their tenant" ON public.proposals;
CREATE POLICY "Users can manage proposals of their tenant" ON public.proposals
FOR ALL
USING (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()))
WITH CHECK (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()));

-- proposal_line_items
DROP POLICY IF EXISTS "Tenant manages own proposal line items" ON public.proposal_line_items;
CREATE POLICY "Tenant manages own proposal line items" ON public.proposal_line_items
FOR ALL
USING (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()))
WITH CHECK (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()));

-- proposal_items
DROP POLICY IF EXISTS "Users can manage proposal_items of their tenant" ON public.proposal_items;
CREATE POLICY "Users can manage proposal_items of their tenant" ON public.proposal_items
FOR ALL
USING (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()))
WITH CHECK (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()));

-- proposal_control_sequences
DROP POLICY IF EXISTS "Tenant manages own proposal sequence" ON public.proposal_control_sequences;
CREATE POLICY "Tenant manages own proposal sequence" ON public.proposal_control_sequences
FOR ALL
USING (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()))
WITH CHECK (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()));

-- proposal_templates
DROP POLICY IF EXISTS "Admins manage proposal templates" ON public.proposal_templates;
CREATE POLICY "Admins manage proposal templates" ON public.proposal_templates
FOR ALL
USING (
  public.is_master(auth.uid())
  OR (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  public.is_master(auth.uid())
  OR (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

DROP POLICY IF EXISTS "Tenant reads own proposal templates" ON public.proposal_templates;
CREATE POLICY "Tenant reads own proposal templates" ON public.proposal_templates
FOR SELECT
USING (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()));

-- generated_documents
DROP POLICY IF EXISTS "Users can manage generated_documents of their tenant" ON public.generated_documents;
CREATE POLICY "Users can manage generated_documents of their tenant" ON public.generated_documents
FOR ALL
USING (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()))
WITH CHECK (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()));

-- document_templates
DROP POLICY IF EXISTS "Users can manage document_templates of their tenant" ON public.document_templates;
CREATE POLICY "Users can manage document_templates of their tenant" ON public.document_templates
FOR ALL
USING (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()))
WITH CHECK (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()));
