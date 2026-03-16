
-- Create contract_signatures table for multi-signer support
CREATE TABLE public.contract_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  signer_role text NOT NULL DEFAULT 'revendedor', -- 'matriz', 'revendedor', 'colaborador'
  signer_name text,
  signer_document text,
  signing_token text,
  signed_at timestamptz,
  signature_photo_url text,
  signature_latitude double precision,
  signature_longitude double precision,
  signature_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- Authenticated users with proper roles can view
CREATE POLICY "Authenticated can view contract signatures"
ON public.contract_signatures FOR SELECT TO authenticated
USING (
  is_master(auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador') OR has_role(auth.uid(), 'leitura')
);

-- Admin/operador can insert
CREATE POLICY "Admin/operador can insert contract signatures"
ON public.contract_signatures FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')
);

-- Anyone can sign via token (public access for signing page)
CREATE POLICY "Anyone can update signature via token"
ON public.contract_signatures FOR UPDATE TO public
USING (signing_token IS NOT NULL AND signed_at IS NULL)
WITH CHECK (signing_token IS NOT NULL);

-- Allow anon select for signing page token lookup
CREATE POLICY "Anon can view by token"
ON public.contract_signatures FOR SELECT TO anon
USING (signing_token IS NOT NULL);
