
-- Create pdf_contracts table
CREATE TABLE public.pdf_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pdf_url TEXT NOT NULL,
  pdf_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_by_user_id UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pdf_contract_signers table
CREATE TABLE public.pdf_contract_signers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.pdf_contracts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf_cnpj TEXT,
  address TEXT,
  signing_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'pendente',
  sign_order INTEGER NOT NULL DEFAULT 0,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_photo_url TEXT,
  signature_latitude DOUBLE PRECISION,
  signature_longitude DOUBLE PRECISION,
  signature_address TEXT,
  signer_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pdf_contract_history table
CREATE TABLE public.pdf_contract_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.pdf_contracts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_contract_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_contract_history ENABLE ROW LEVEL SECURITY;

-- RLS for pdf_contracts: Master/CEO can manage, others can view
CREATE POLICY "Master/CEO can manage pdf contracts"
  ON public.pdf_contracts FOR ALL TO authenticated
  USING (
    is_master(auth.uid()) OR 
    (has_role(auth.uid(), 'ceo') AND servidor_id = get_user_company_id(auth.uid()))
  )
  WITH CHECK (
    is_master(auth.uid()) OR 
    (has_role(auth.uid(), 'ceo') AND servidor_id = get_user_company_id(auth.uid()))
  );

CREATE POLICY "Users can view pdf contracts for their servidor"
  ON public.pdf_contracts FOR SELECT TO authenticated
  USING (
    is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid())
  );

-- RLS for pdf_contract_signers
CREATE POLICY "Master/CEO can manage signers"
  ON public.pdf_contract_signers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pdf_contracts pc
      WHERE pc.id = pdf_contract_signers.contract_id
      AND (is_master(auth.uid()) OR (has_role(auth.uid(), 'ceo') AND pc.servidor_id = get_user_company_id(auth.uid())))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pdf_contracts pc
      WHERE pc.id = pdf_contract_signers.contract_id
      AND (is_master(auth.uid()) OR (has_role(auth.uid(), 'ceo') AND pc.servidor_id = get_user_company_id(auth.uid())))
    )
  );

CREATE POLICY "Users can view signers for their servidor"
  ON public.pdf_contract_signers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pdf_contracts pc
      WHERE pc.id = pdf_contract_signers.contract_id
      AND (is_master(auth.uid()) OR pc.servidor_id = get_user_company_id(auth.uid()))
    )
  );

-- Anon can view/update signer via token (for public signing page)
CREATE POLICY "Anon can view signer by token"
  ON public.pdf_contract_signers FOR SELECT TO anon
  USING (signing_token IS NOT NULL);

CREATE POLICY "Anon can sign via token"
  ON public.pdf_contract_signers FOR UPDATE TO anon
  USING (signing_token IS NOT NULL AND status = 'pendente')
  WITH CHECK (signing_token IS NOT NULL);

-- Anon can view contract for signing
CREATE POLICY "Anon can view pdf contract for signing"
  ON public.pdf_contracts FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.pdf_contract_signers s
      WHERE s.contract_id = pdf_contracts.id AND s.signing_token IS NOT NULL
    )
  );

-- RLS for pdf_contract_history
CREATE POLICY "Users can view pdf contract history"
  ON public.pdf_contract_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pdf_contracts pc
      WHERE pc.id = pdf_contract_history.contract_id
      AND (is_master(auth.uid()) OR pc.servidor_id = get_user_company_id(auth.uid()))
    )
  );

CREATE POLICY "Master/CEO can insert pdf contract history"
  ON public.pdf_contract_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pdf_contracts pc
      WHERE pc.id = pdf_contract_history.contract_id
      AND (is_master(auth.uid()) OR (has_role(auth.uid(), 'ceo') AND pc.servidor_id = get_user_company_id(auth.uid())))
    )
  );

CREATE POLICY "Anon can insert history via signing"
  ON public.pdf_contract_history FOR INSERT TO anon
  WITH CHECK (true);

-- Storage bucket for contract PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('contract-pdfs', 'contract-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for contract-pdfs bucket
CREATE POLICY "Authenticated users can upload contract PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contract-pdfs');

CREATE POLICY "Anyone can view contract PDFs"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'contract-pdfs');

-- Updated_at trigger
CREATE TRIGGER handle_pdf_contracts_updated_at
  BEFORE UPDATE ON public.pdf_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
