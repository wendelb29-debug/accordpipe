
-- 1. Create RPC to get signer by token (replaces anon SELECT policy)
CREATE OR REPLACE FUNCTION public.get_pdf_signer_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  contract_id uuid,
  name text,
  email text,
  cpf_cnpj text,
  phone text,
  address text,
  sign_order integer,
  status text,
  signed_at timestamptz,
  signature_photo_url text,
  signature_address text,
  signature_latitude double precision,
  signature_longitude double precision,
  signer_ip text,
  signing_token text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, contract_id, name, email, cpf_cnpj, phone, address, sign_order, status, signed_at,
         signature_photo_url, signature_address, signature_latitude, signature_longitude, signer_ip, signing_token
  FROM public.pdf_contract_signers
  WHERE signing_token = p_token
  LIMIT 1;
$$;

-- 2. Create RPC to get all signers for a contract (limited fields, requires valid token)
CREATE OR REPLACE FUNCTION public.get_pdf_contract_signers_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  name text,
  sign_order integer,
  status text,
  signed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.sign_order, s.status, s.signed_at
  FROM public.pdf_contract_signers s
  WHERE s.contract_id = (
    SELECT contract_id FROM public.pdf_contract_signers WHERE signing_token = p_token LIMIT 1
  )
  ORDER BY s.sign_order;
$$;

-- 3. Drop the dangerous anon SELECT policy that exposes all PII
DROP POLICY IF EXISTS "Anon can view signer by token" ON public.pdf_contract_signers;

-- 4. Fix user-signatures storage policies: add ownership checks
DROP POLICY IF EXISTS "Allow authenticated users to update user-signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete user-signatures" ON storage.objects;

CREATE POLICY "Owner can update own user-signatures"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner can delete own user-signatures"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);
