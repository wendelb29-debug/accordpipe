
-- Proposal Items (produtos/serviços disponíveis)
CREATE TABLE public.proposal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'servico',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage proposal_items of their tenant"
  ON public.proposal_items FOR ALL TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (servidor_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_proposal_items_updated_at
  BEFORE UPDATE ON public.proposal_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Proposals
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.proposal_items(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  pdf_url TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  created_by_user_id UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage proposals of their tenant"
  ON public.proposals FOR ALL TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (servidor_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Document Templates
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'contrato',
  arquivo_url TEXT,
  arquivo_nome TEXT,
  arquivo_path TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage document_templates of their tenant"
  ON public.document_templates FOR ALL TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (servidor_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Generated Documents
CREATE TABLE public.generated_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'contrato',
  status TEXT NOT NULL DEFAULT 'gerado',
  pdf_url TEXT,
  html_content TEXT,
  created_by_user_id UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage generated_documents of their tenant"
  ON public.generated_documents FOR ALL TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (servidor_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
