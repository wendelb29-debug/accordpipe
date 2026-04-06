CREATE TABLE public.lead_post_sale (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE UNIQUE,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pessoa_financeira TEXT,
  telefone_financeiro TEXT,
  email_financeiro TEXT,
  comprovante_url TEXT,
  comprovante_path TEXT,
  link_proposta_assinada TEXT,
  observacoes_venda TEXT,
  updated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_post_sale ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage lead post sale data"
  ON public.lead_post_sale
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);