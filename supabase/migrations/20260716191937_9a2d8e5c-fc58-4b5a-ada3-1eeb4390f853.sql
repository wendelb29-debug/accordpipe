
-- Envio em Massa: campanhas, destinatários e modelos (multi-tenant por server_id)

CREATE TABLE public.mass_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','email')),
  channel_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','running','paused','completed','failed','canceled')),
  audience_mode TEXT CHECK (audience_mode IN ('file','crm','manual')),
  audience_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_type TEXT CHECK (content_type IN ('template','editor','flow')),
  template_id UUID,
  subject TEXT,
  body TEXT,
  variable_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  speed TEXT NOT NULL DEFAULT 'medium' CHECK (speed IN ('slow','medium','fast')),
  batch_size INT NOT NULL DEFAULT 20,
  batch_interval_min INT NOT NULL DEFAULT 5,
  scheduled_at TIMESTAMPTZ,
  daily_window_start TIME,
  daily_window_end TIME,
  totals JSONB NOT NULL DEFAULT '{"queued":0,"sent":0,"failed":0,"replied":0}'::jsonb,
  last_dispatch_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mass_campaigns_tenant ON public.mass_campaigns(tenant_id);
CREATE INDEX idx_mass_campaigns_status ON public.mass_campaigns(status) WHERE status IN ('scheduled','running');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mass_campaigns TO authenticated;
GRANT ALL ON public.mass_campaigns TO service_role;
ALTER TABLE public.mass_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mass_campaigns tenant members"
ON public.mass_campaigns FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = mass_campaigns.tenant_id)
  OR public.has_role(auth.uid(), 'master')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = mass_campaigns.tenant_id)
  OR public.has_role(auth.uid(), 'master')
);

CREATE TABLE public.mass_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.mass_campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name TEXT,
  contact TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','skipped')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcr_campaign ON public.mass_campaign_recipients(campaign_id, status);
CREATE INDEX idx_mcr_tenant ON public.mass_campaign_recipients(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mass_campaign_recipients TO authenticated;
GRANT ALL ON public.mass_campaign_recipients TO service_role;
ALTER TABLE public.mass_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mass_campaign_recipients tenant members"
ON public.mass_campaign_recipients FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = mass_campaign_recipients.tenant_id)
  OR public.has_role(auth.uid(), 'master')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = mass_campaign_recipients.tenant_id)
  OR public.has_role(auth.uid(), 'master')
);

CREATE TABLE public.mass_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','email')),
  category TEXT,
  type TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mass_templates_tenant ON public.mass_templates(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mass_templates TO authenticated;
GRANT ALL ON public.mass_templates TO service_role;
ALTER TABLE public.mass_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mass_templates tenant members"
ON public.mass_templates FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = mass_templates.tenant_id)
  OR public.has_role(auth.uid(), 'master')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = mass_templates.tenant_id)
  OR public.has_role(auth.uid(), 'master')
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_mass_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_mass_campaigns_updated BEFORE UPDATE ON public.mass_campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_mass_updated_at();
CREATE TRIGGER trg_mass_templates_updated BEFORE UPDATE ON public.mass_templates
FOR EACH ROW EXECUTE FUNCTION public.set_mass_updated_at();
