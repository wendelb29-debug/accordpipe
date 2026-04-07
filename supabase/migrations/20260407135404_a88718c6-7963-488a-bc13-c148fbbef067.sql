-- Drop the dangerous anon SELECT policy that exposes all signer PII
DROP POLICY IF EXISTS "Anyone can view signer by token" ON public.client_contract_signers;

-- Create secure RPC to get client contract signer by token (for edge functions/public signing)
CREATE OR REPLACE FUNCTION public.get_client_signer_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  contract_id uuid,
  name text,
  email text,
  signer_type text,
  signer_document text,
  sign_order integer,
  status text,
  signed_at timestamptz,
  signature_photo_url text,
  signature_address text,
  signature_latitude double precision,
  signature_longitude double precision,
  signer_ip text,
  signing_token text,
  is_required boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, contract_id, name, email, signer_type, signer_document, sign_order, status, signed_at,
         signature_photo_url, signature_address, signature_latitude, signature_longitude, signer_ip, signing_token, is_required
  FROM public.client_contract_signers
  WHERE signing_token = p_token
  LIMIT 1;
$$;

-- Create secure RPC to get all signers for a client contract (limited fields for progress display)
CREATE OR REPLACE FUNCTION public.get_client_contract_signers_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  name text,
  signer_type text,
  sign_order integer,
  status text,
  signed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.signer_type, s.sign_order, s.status, s.signed_at
  FROM public.client_contract_signers s
  WHERE s.contract_id = (
    SELECT contract_id FROM public.client_contract_signers WHERE signing_token = p_token LIMIT 1
  )
  ORDER BY s.sign_order;
$$;