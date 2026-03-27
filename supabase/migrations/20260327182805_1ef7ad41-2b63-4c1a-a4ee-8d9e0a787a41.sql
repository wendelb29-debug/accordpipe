-- Allow anon to update pdf_contracts status when signing completes
CREATE POLICY "Anon can update pdf contract status on sign"
ON public.pdf_contracts
FOR UPDATE
TO anon
USING (EXISTS (
  SELECT 1 FROM pdf_contract_signers s
  WHERE s.contract_id = pdf_contracts.id AND s.signing_token IS NOT NULL
))
WITH CHECK (status = 'assinado');

-- Allow authenticated to update pdf_contracts status on sign
CREATE POLICY "Authenticated can update pdf contract status on sign"
ON public.pdf_contracts
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pdf_contract_signers s
  WHERE s.contract_id = pdf_contracts.id AND s.signing_token IS NOT NULL
))
WITH CHECK (true);