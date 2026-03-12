
-- Companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL UNIQUE,
  razao_social text NOT NULL,
  nome_fantasia text,
  responsavel text,
  email text,
  telefone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'delinquent', 'cancelled')),
  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view companies"
  ON public.companies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/operador can insert companies"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Admin/operador can update companies"
  ON public.companies FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Only master can delete companies"
  ON public.companies FOR DELETE TO authenticated
  USING (public.is_master(auth.uid()));

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Documents table
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_path text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  file_type text,
  category text NOT NULL DEFAULT 'outro' CHECK (category IN ('comprovante', 'cnpj', 'contrato', 'endereco', 'outro')),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documents"
  ON public.documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/operador can insert documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Only master can delete documents"
  ON public.documents FOR DELETE TO authenticated
  USING (public.is_master(auth.uid()));

-- Contracts table
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_type text NOT NULL DEFAULT 'new' CHECK (contract_type IN ('new', 'renewal')),
  signature_status text NOT NULL DEFAULT 'pending' CHECK (signature_status IN ('pending', 'signed', 'expired')),
  signature_type text DEFAULT 'govbr',
  signature_link text,
  signed_at timestamptz,
  link_expires_at timestamptz,
  foro text,
  matriz_nome text DEFAULT 'Save Car Brasil Tecnologia e Serviços Ltda',
  matriz_cnpj text,
  matriz_endereco text,
  contract_content text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contracts"
  ON public.contracts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/operador can insert contracts"
  ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE POLICY "Admin/operador can update contracts"
  ON public.contracts FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  );

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Generate contract code sequence
CREATE SEQUENCE IF NOT EXISTS contract_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_contract_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.code := 'CTR-' || LPAD(nextval('contract_code_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_contract_code
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.generate_contract_code();

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

CREATE POLICY "Authenticated users can view document files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "Admin/operador can upload document files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador')
  ));

CREATE POLICY "Master can delete document files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.is_master(auth.uid()));
