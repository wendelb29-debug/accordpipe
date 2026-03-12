
-- CRM Leads table for Kanban pipeline
CREATE TABLE public.crm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'Manual',
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  value_ps NUMERIC NOT NULL DEFAULT 0,
  value_mrr NUMERIC NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'standby',
  stage_entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leads for their servidor"
  ON public.crm_leads FOR SELECT
  USING (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/operador can insert leads"
  ON public.crm_leads FOR INSERT
  WITH CHECK (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role)) AND servidor_id = get_user_company_id(auth.uid())));

CREATE POLICY "Admin/operador can update leads"
  ON public.crm_leads FOR UPDATE
  USING (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role)) AND servidor_id = get_user_company_id(auth.uid())));

CREATE POLICY "Admin/operador can delete leads"
  ON public.crm_leads FOR DELETE
  USING (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role)) AND servidor_id = get_user_company_id(auth.uid())));

CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_crm_leads_stage ON public.crm_leads(stage);
CREATE INDEX idx_crm_leads_servidor ON public.crm_leads(servidor_id);
