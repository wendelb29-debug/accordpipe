
CREATE TABLE public.tenant_setup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'reviewed', 'activated', 'expired')),
  
  -- Data filled by client
  cnpj TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  responsavel TEXT,
  email TEXT,
  telefone TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  
  -- Brand
  brand_logo_url TEXT,
  brand_primary_color TEXT,
  brand_secondary_color TEXT,
  brand_accent_color TEXT,
  brand_bg_color TEXT,
  brand_text_color TEXT,
  
  -- Internal
  created_by UUID,
  reviewed_by UUID,
  reviewer_notes TEXT,
  resulting_company_id UUID REFERENCES public.companies(id),
  submitted_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_setup_requests ENABLE ROW LEVEL SECURITY;

-- Public access by token (for the external form)
CREATE POLICY "Anyone can read by token"
  ON public.tenant_setup_requests FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update by token when pending"
  ON public.tenant_setup_requests FOR UPDATE
  USING (status IN ('pending', 'submitted'));

-- Authenticated users can create
CREATE POLICY "Authenticated can insert"
  ON public.tenant_setup_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_tenant_setup_requests_updated_at
  BEFORE UPDATE ON public.tenant_setup_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
