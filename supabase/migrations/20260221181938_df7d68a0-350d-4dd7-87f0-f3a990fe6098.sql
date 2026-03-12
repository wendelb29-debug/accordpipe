
-- Add created_by tracking to crm_leads
ALTER TABLE public.crm_leads ADD COLUMN created_by_user_id UUID;
ALTER TABLE public.crm_leads ADD COLUMN created_by_name TEXT;

-- Allow anonymous inserts via edge function (service role bypasses RLS anyway)
-- No changes needed since the edge function will use the service role key
