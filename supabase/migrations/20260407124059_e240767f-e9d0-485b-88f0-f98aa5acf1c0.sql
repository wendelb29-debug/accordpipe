-- 1. Fix company_contract_templates: scope to user's company
DROP POLICY IF EXISTS "Authenticated users can manage contract templates" ON public.company_contract_templates;

CREATE POLICY "Users can manage own company templates"
ON public.company_contract_templates
FOR ALL
TO authenticated
USING (company_id = get_user_company_id(auth.uid()) OR is_master(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()) OR is_master(auth.uid()));

-- 2. Fix company_contract_template_fields: scope via parent template
DROP POLICY IF EXISTS "Authenticated users can manage template fields" ON public.company_contract_template_fields;

CREATE POLICY "Users can manage own company template fields"
ON public.company_contract_template_fields
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.company_contract_templates t
  WHERE t.id = template_id
  AND (t.company_id = get_user_company_id(auth.uid()) OR is_master(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.company_contract_templates t
  WHERE t.id = template_id
  AND (t.company_id = get_user_company_id(auth.uid()) OR is_master(auth.uid()))
));

-- 3. Fix lead_documents: scope to user's company
DROP POLICY IF EXISTS "Authenticated users can manage lead documents" ON public.lead_documents;

CREATE POLICY "Users can manage lead documents for their servidor"
ON public.lead_documents
FOR ALL
TO authenticated
USING (servidor_id = get_user_company_id(auth.uid()) OR is_master(auth.uid()))
WITH CHECK (servidor_id = get_user_company_id(auth.uid()) OR is_master(auth.uid()));

-- 4. Fix lead_post_sale: scope to user's company
DROP POLICY IF EXISTS "Authenticated users can manage lead post sale data" ON public.lead_post_sale;

CREATE POLICY "Users can manage lead post sale for their servidor"
ON public.lead_post_sale
FOR ALL
TO authenticated
USING (servidor_id = get_user_company_id(auth.uid()) OR is_master(auth.uid()))
WITH CHECK (servidor_id = get_user_company_id(auth.uid()) OR is_master(auth.uid()));

-- 5. Fix client_contract_signers: remove the overly permissive anon SELECT (USING true)
DROP POLICY IF EXISTS "Anon can view signers by signing token" ON public.client_contract_signers;

-- The "Anyone can view signer by token" policy with USING (signing_token IS NOT NULL) stays
-- but let's also remove the anon UPDATE that only checks existence
DROP POLICY IF EXISTS "Anyone can update signer by token" ON public.client_contract_signers;

-- 6. Remove dangerous public UPDATE policies on contracts (signing goes through edge function with service_role)
DROP POLICY IF EXISTS "Anyone can sign contracts via token" ON public.contracts;

-- 7. Remove dangerous anon UPDATE on client_contracts
DROP POLICY IF EXISTS "Anon can sign via token" ON public.client_contracts;

-- 8. Remove dangerous anon/auth UPDATE on pdf_contract_signers (edge function handles this)
DROP POLICY IF EXISTS "Anon can sign via token" ON public.pdf_contract_signers;
DROP POLICY IF EXISTS "Authenticated can sign via token" ON public.pdf_contract_signers;

-- 9. Remove dangerous anon/auth UPDATE on pdf_contracts
DROP POLICY IF EXISTS "Anon can update pdf contract status on sign" ON public.pdf_contracts;
DROP POLICY IF EXISTS "Auth can update pdf contract on sign" ON public.pdf_contracts;