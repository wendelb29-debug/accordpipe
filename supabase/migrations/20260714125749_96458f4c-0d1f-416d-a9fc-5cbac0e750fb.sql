
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS is_request boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS request_title text,
  ADD COLUMN IF NOT EXISTS request_notes text;

CREATE INDEX IF NOT EXISTS idx_crm_leads_is_request ON public.crm_leads(is_request) WHERE is_request = true;

-- RESTRICTIVE policy: for rows flagged as request, only owner / creator / master / admin / ceo can see & update
DROP POLICY IF EXISTS "restrict_request_leads_select" ON public.crm_leads;
CREATE POLICY "restrict_request_leads_select"
  ON public.crm_leads
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    is_request = false
    OR created_by_user_id = auth.uid()
    OR public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
  );

DROP POLICY IF EXISTS "restrict_request_leads_update" ON public.crm_leads;
CREATE POLICY "restrict_request_leads_update"
  ON public.crm_leads
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    is_request = false
    OR created_by_user_id = auth.uid()
    OR public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
  );
