-- Allow authenticated users to also access signers by token (for signing page)
CREATE POLICY "Authenticated can view signer by token"
ON public.pdf_contract_signers
FOR SELECT
TO authenticated
USING (signing_token IS NOT NULL);

CREATE POLICY "Authenticated can sign via token"
ON public.pdf_contract_signers
FOR UPDATE
TO authenticated
USING (signing_token IS NOT NULL AND status = 'pendente')
WITH CHECK (signing_token IS NOT NULL);

-- Allow authenticated users to view pdf contract for signing via token
CREATE POLICY "Authenticated can view pdf contract for signing"
ON public.pdf_contracts
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM pdf_contract_signers s
  WHERE s.contract_id = pdf_contracts.id AND s.signing_token IS NOT NULL
));

-- Allow authenticated users to insert history during signing
CREATE POLICY "Authenticated can insert history via signing"
ON public.pdf_contract_history
FOR INSERT
TO authenticated
WITH CHECK (true);