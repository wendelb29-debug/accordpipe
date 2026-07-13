ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS origin_workspace_id uuid,
  ADD COLUMN IF NOT EXISTS origin_stage text;

CREATE INDEX IF NOT EXISTS idx_crm_leads_origin_workspace_id ON public.crm_leads(origin_workspace_id);