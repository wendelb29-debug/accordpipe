
-- Drop the old FK referencing client_contracts
ALTER TABLE public.client_contract_signers DROP CONSTRAINT client_contract_signers_contract_id_fkey;

-- Add FK referencing contracts table instead
ALTER TABLE public.client_contract_signers ADD CONSTRAINT client_contract_signers_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can insert signers for their company contracts" ON public.client_contract_signers;
DROP POLICY IF EXISTS "Users can view signers from their company" ON public.client_contract_signers;
DROP POLICY IF EXISTS "Users can update signers for their company contracts" ON public.client_contract_signers;
DROP POLICY IF EXISTS "Users can delete signers for their company contracts" ON public.client_contract_signers;

-- Create a helper function to check contract ownership via contracts table
CREATE OR REPLACE FUNCTION public.get_contract_company_id(_contract_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.contracts WHERE id = _contract_id
  UNION ALL
  SELECT servidor_id FROM public.client_contracts WHERE id = _contract_id
  LIMIT 1
$$;

-- Recreate RLS policies using the helper function
CREATE POLICY "Users can insert signers for their company contracts"
  ON public.client_contract_signers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_contract_company_id(contract_id) = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Users can view signers from their company"
  ON public.client_contract_signers FOR SELECT
  TO authenticated
  USING (
    public.get_contract_company_id(contract_id) = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Users can update signers for their company contracts"
  ON public.client_contract_signers FOR UPDATE
  TO authenticated
  USING (
    public.get_contract_company_id(contract_id) = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Users can delete signers for their company contracts"
  ON public.client_contract_signers FOR DELETE
  TO authenticated
  USING (
    public.get_contract_company_id(contract_id) = public.get_user_company_id(auth.uid())
  );
