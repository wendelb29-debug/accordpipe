
-- Company contract templates (one per server)
CREATE TABLE public.company_contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Contrato Padrão',
  pdf_url TEXT NOT NULL,
  pdf_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Template fields (drag-and-drop positions)
CREATE TABLE public.company_contract_template_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.company_contract_templates(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL DEFAULT 'text',
  label TEXT,
  page INTEGER NOT NULL DEFAULT 1,
  pos_x NUMERIC NOT NULL DEFAULT 0,
  pos_y NUMERIC NOT NULL DEFAULT 0,
  width NUMERIC NOT NULL DEFAULT 200,
  height NUMERIC NOT NULL DEFAULT 40,
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.company_contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_contract_template_fields ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write templates
CREATE POLICY "Authenticated users can manage contract templates"
  ON public.company_contract_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage template fields"
  ON public.company_contract_template_fields FOR ALL TO authenticated USING (true) WITH CHECK (true);
