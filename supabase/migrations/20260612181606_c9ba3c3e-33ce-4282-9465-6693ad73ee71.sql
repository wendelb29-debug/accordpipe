ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS trash_reason text;

CREATE INDEX IF NOT EXISTS idx_crm_leads_status
  ON public.crm_leads (servidor_id, lead_status, status_changed_at DESC);