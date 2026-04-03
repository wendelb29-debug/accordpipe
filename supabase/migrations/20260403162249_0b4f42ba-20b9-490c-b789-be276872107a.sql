
-- Allow admin to manage pdf contract fields too
DROP POLICY IF EXISTS "Master/CEO can manage pdf contract fields" ON public.pdf_contract_fields;
CREATE POLICY "Master/Admin/CEO can manage pdf contract fields"
ON public.pdf_contract_fields
FOR ALL
TO authenticated
USING (
  is_master(auth.uid()) OR (
    (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'admin')) AND 
    get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  is_master(auth.uid()) OR (
    (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'admin')) AND 
    get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
  )
);

-- Allow admin to manage signers
DROP POLICY IF EXISTS "Master/CEO can manage signers" ON public.pdf_contract_signers;
CREATE POLICY "Master/Admin/CEO can manage signers"
ON public.pdf_contract_signers
FOR ALL
TO authenticated
USING (
  is_master(auth.uid()) OR (
    (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'admin')) AND 
    get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  is_master(auth.uid()) OR (
    (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'admin')) AND 
    get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
  )
);

-- Allow admin to insert contract history
DROP POLICY IF EXISTS "Master/CEO can insert pdf contract history" ON public.pdf_contract_history;
CREATE POLICY "Master/Admin/CEO can insert pdf contract history"
ON public.pdf_contract_history
FOR INSERT
TO authenticated
WITH CHECK (
  is_master(auth.uid()) OR (
    (has_role(auth.uid(), 'ceo') OR has_role(auth.uid(), 'admin')) AND 
    get_pdf_contract_servidor(contract_id) = get_user_company_id(auth.uid())
  )
);
