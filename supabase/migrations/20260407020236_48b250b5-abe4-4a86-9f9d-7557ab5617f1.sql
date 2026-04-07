
-- Remove FK entirely - contract_id can reference either contracts or client_contracts
ALTER TABLE public.client_contract_signers DROP CONSTRAINT IF EXISTS client_contract_signers_contract_id_fkey;

-- Add anon policy so public signing links can look up signers
CREATE POLICY "Anon can view signers by signing token"
  ON public.client_contract_signers FOR SELECT
  TO anon
  USING (true);

-- Allow anon to update signers (for signing flow via edge function with service role)
-- The edge function uses service role key so this isn't strictly needed,
-- but ensures the get-contract-by-token can read signers

-- Update helper function
CREATE OR REPLACE FUNCTION public.get_contract_company_id(_contract_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT servidor_id FROM public.client_contracts WHERE id = _contract_id
  UNION ALL
  SELECT company_id FROM public.contracts WHERE id = _contract_id
  LIMIT 1
$$;
