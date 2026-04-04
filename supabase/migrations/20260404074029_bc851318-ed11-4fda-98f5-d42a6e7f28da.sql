
-- Add document_hash and validation_code to contracts table
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS document_hash text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS validation_code text;

-- Add document_hash and validation_code to client_contracts table
ALTER TABLE public.client_contracts ADD COLUMN IF NOT EXISTS document_hash text;
ALTER TABLE public.client_contracts ADD COLUMN IF NOT EXISTS validation_code text;

-- Add signer_ip to contract_signatures table
ALTER TABLE public.contract_signatures ADD COLUMN IF NOT EXISTS signer_ip text;
