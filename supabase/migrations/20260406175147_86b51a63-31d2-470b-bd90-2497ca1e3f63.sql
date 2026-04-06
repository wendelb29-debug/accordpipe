
-- Table for client contract signers (multi-signature support)
CREATE TABLE public.client_contract_signers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.client_contracts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  signer_type TEXT NOT NULL DEFAULT 'cliente',
  is_required BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pendente',
  sign_order INTEGER NOT NULL DEFAULT 1,
  signing_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  signed_at TIMESTAMP WITH TIME ZONE,
  signer_ip TEXT,
  signer_document TEXT,
  signature_photo_url TEXT,
  signature_address TEXT,
  signature_latitude DOUBLE PRECISION,
  signature_longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_contract_signers ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view signers of contracts from their company
CREATE POLICY "Users can view signers from their company"
  ON public.client_contract_signers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_contracts cc
      JOIN public.profiles p ON p.company_id = cc.servidor_id
      WHERE cc.id = contract_id AND p.user_id = auth.uid()
    )
  );

-- RLS: Users can insert signers for contracts from their company
CREATE POLICY "Users can insert signers for their company contracts"
  ON public.client_contract_signers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_contracts cc
      JOIN public.profiles p ON p.company_id = cc.servidor_id
      WHERE cc.id = contract_id AND p.user_id = auth.uid()
    )
  );

-- RLS: Users can update signers for contracts from their company
CREATE POLICY "Users can update signers for their company contracts"
  ON public.client_contract_signers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_contracts cc
      JOIN public.profiles p ON p.company_id = cc.servidor_id
      WHERE cc.id = contract_id AND p.user_id = auth.uid()
    )
  );

-- RLS: Users can delete signers for contracts from their company
CREATE POLICY "Users can delete signers for their company contracts"
  ON public.client_contract_signers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_contracts cc
      JOIN public.profiles p ON p.company_id = cc.servidor_id
      WHERE cc.id = contract_id AND p.user_id = auth.uid()
    )
  );

-- Allow anonymous access for signing via token
CREATE POLICY "Anyone can view signer by token"
  ON public.client_contract_signers
  FOR SELECT
  TO anon
  USING (signing_token IS NOT NULL);

CREATE POLICY "Anyone can update signer by token"
  ON public.client_contract_signers
  FOR UPDATE
  TO anon
  USING (signing_token IS NOT NULL);
