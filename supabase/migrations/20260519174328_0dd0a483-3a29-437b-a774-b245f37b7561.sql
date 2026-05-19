
ALTER TABLE public.pdf_contracts
  ADD COLUMN IF NOT EXISTS icp_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS icp_signer_cn text,
  ADD COLUMN IF NOT EXISTS icp_tsa_token text,
  ADD COLUMN IF NOT EXISTS icp_tsa_authority text,
  ADD COLUMN IF NOT EXISTS icp_pdf_url text,
  ADD COLUMN IF NOT EXISTS icp_cert_valid_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_pdf_contracts_icp_signed_at
  ON public.pdf_contracts (icp_signed_at)
  WHERE icp_signed_at IS NOT NULL;
