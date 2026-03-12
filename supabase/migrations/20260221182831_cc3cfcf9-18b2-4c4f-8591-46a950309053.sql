
-- Add extra fields to crm_leads
ALTER TABLE public.crm_leads 
  ADD COLUMN cidade TEXT,
  ADD COLUMN estado TEXT,
  ADD COLUMN forecast_date DATE,
  ADD COLUMN lead_status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN lost_reason TEXT;

-- CRM Lead Activities table for timeline/history
CREATE TABLE public.crm_lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  created_by_user_id UUID,
  created_by_name TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities for their servidor"
  ON public.crm_lead_activities FOR SELECT
  USING (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/operador can insert activities"
  ON public.crm_lead_activities FOR INSERT
  WITH CHECK (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role)) AND servidor_id = get_user_company_id(auth.uid())));

CREATE POLICY "Admin/operador can delete activities"
  ON public.crm_lead_activities FOR DELETE
  USING (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role)) AND servidor_id = get_user_company_id(auth.uid())));

CREATE INDEX idx_crm_lead_activities_lead ON public.crm_lead_activities(lead_id);
CREATE INDEX idx_crm_lead_activities_servidor ON public.crm_lead_activities(servidor_id);
