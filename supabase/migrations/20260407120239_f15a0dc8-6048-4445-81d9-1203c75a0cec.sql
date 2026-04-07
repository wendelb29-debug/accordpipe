
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_signatures;
