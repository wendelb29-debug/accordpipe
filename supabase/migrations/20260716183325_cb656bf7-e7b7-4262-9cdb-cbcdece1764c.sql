
CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  folder_id text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_for timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  message_type text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_campaigns TO authenticated;
GRANT ALL ON public.whatsapp_campaigns TO service_role;

ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view campaigns"
  ON public.whatsapp_campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = whatsapp_campaigns.tenant_id
        AND ut.status = 'active'
    )
    OR public.has_role(auth.uid(), 'master'::app_role)
  );

DROP TRIGGER IF EXISTS trg_whatsapp_campaigns_updated_at ON public.whatsapp_campaigns;
CREATE TRIGGER trg_whatsapp_campaigns_updated_at
  BEFORE UPDATE ON public.whatsapp_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_tenant ON public.whatsapp_campaigns(tenant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_campaigns_folder ON public.whatsapp_campaigns(tenant_id, folder_id);
