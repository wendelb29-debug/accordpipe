-- Drop problematic policies on pdf_contracts
DROP POLICY IF EXISTS "Authenticated can view pdf contract for signing" ON public.pdf_contracts;
DROP POLICY IF EXISTS "Authenticated can update pdf contract status on sign" ON public.pdf_contracts;
DROP POLICY IF EXISTS "Anon can view pdf contract for signing" ON public.pdf_contracts;
DROP POLICY IF EXISTS "Anon can update pdf contract status on sign" ON public.pdf_contracts;

-- Recreate simpler anon policies using existing SECURITY DEFINER function
CREATE POLICY "Anon can view pdf contract for signing"
ON public.pdf_contracts
FOR SELECT
TO anon
USING (public.pdf_contract_has_signer_token(id));

CREATE POLICY "Anon can update pdf contract status on sign"
ON public.pdf_contracts
FOR UPDATE
TO anon
USING (public.pdf_contract_has_signer_token(id))
WITH CHECK (status = 'assinado');

-- Recreate authenticated policies without cross-referencing
CREATE POLICY "Auth can view pdf contract for signing"
ON public.pdf_contracts
FOR SELECT
TO authenticated
USING (public.pdf_contract_has_signer_token(id));

CREATE POLICY "Auth can update pdf contract on sign"
ON public.pdf_contracts
FOR UPDATE
TO authenticated
USING (public.pdf_contract_has_signer_token(id))
WITH CHECK (public.pdf_contract_has_signer_token(id));

-- Fix pdf_contract_signers: drop and recreate anon view policy
DROP POLICY IF EXISTS "Anon can view signer by token" ON public.pdf_contract_signers;
CREATE POLICY "Anon can view signer by token"
ON public.pdf_contract_signers
FOR SELECT
TO anon
USING (signing_token IS NOT NULL);