
-- Remove duplicate contract_signatures keeping only the best one per (contract_id, signer_role)
-- "Best" = the one with signed_at set, or failing that the most recent one
DELETE FROM public.contract_signatures
WHERE id NOT IN (
  SELECT DISTINCT ON (contract_id, signer_role) id
  FROM public.contract_signatures
  ORDER BY contract_id, signer_role, signed_at DESC NULLS LAST, created_at DESC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.contract_signatures
  ADD CONSTRAINT unique_contract_signer_role UNIQUE (contract_id, signer_role);
