
CREATE TABLE public.ad_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('meta','google')),
  business_id text,
  ad_account_id text,
  page_id text,
  system_user_token text,
  page_access_token text,
  google_webhook_key text,
  connected_by uuid,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_integrations TO authenticated;
GRANT ALL ON public.ad_integrations TO service_role;
REVOKE SELECT (system_user_token, page_access_token, google_webhook_key)
  ON public.ad_integrations FROM anon, authenticated;

ALTER TABLE public.ad_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ad_integrations for their servidor"
  ON public.ad_integrations FOR SELECT
  USING (public.is_master(auth.uid()) OR (servidor_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "Admin/operador can manage ad_integrations"
  ON public.ad_integrations FOR ALL
  USING (
    public.is_master(auth.uid()) OR (
      (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
      AND servidor_id = public.get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    public.is_master(auth.uid()) OR (
      (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
      AND servidor_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE TRIGGER trg_ad_integrations_updated_at
  BEFORE UPDATE ON public.ad_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ad_lead_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('meta','google')),
  external_form_id text,
  external_form_name text,
  page_id text,
  campaign_id text,
  google_webhook_key text,
  workspace_id uuid,
  stage text,
  tags text[] DEFAULT '{}',
  field_mapping jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_lead_at timestamptz,
  lead_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_lead_forms TO authenticated;
GRANT ALL ON public.ad_lead_forms TO service_role;
REVOKE SELECT (google_webhook_key) ON public.ad_lead_forms FROM anon, authenticated;

ALTER TABLE public.ad_lead_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ad_lead_forms for their servidor"
  ON public.ad_lead_forms FOR SELECT
  USING (public.is_master(auth.uid()) OR (servidor_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "Admin/operador can manage ad_lead_forms"
  ON public.ad_lead_forms FOR ALL
  USING (
    public.is_master(auth.uid()) OR (
      (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
      AND servidor_id = public.get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    public.is_master(auth.uid()) OR (
      (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
      AND servidor_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE INDEX idx_ad_lead_forms_servidor ON public.ad_lead_forms(servidor_id);
CREATE INDEX idx_ad_lead_forms_provider ON public.ad_lead_forms(provider, is_active);

CREATE TABLE public.ad_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid,
  provider text,
  external_lead_id text,
  raw_payload jsonb,
  processed boolean DEFAULT false,
  crm_lead_id uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ad_lead_events TO authenticated;
GRANT ALL ON public.ad_lead_events TO service_role;

ALTER TABLE public.ad_lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ad_lead_events for their servidor"
  ON public.ad_lead_events FOR SELECT
  USING (public.is_master(auth.uid()) OR (servidor_id = public.get_user_company_id(auth.uid())));

CREATE UNIQUE INDEX ad_lead_events_provider_extlead_uniq
  ON public.ad_lead_events(provider, external_lead_id)
  WHERE external_lead_id IS NOT NULL;

CREATE INDEX idx_ad_lead_events_servidor ON public.ad_lead_events(servidor_id);
