
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE,
  uazapi_instance_id text,
  uazapi_token text,
  instance_name text,
  status text NOT NULL DEFAULT 'disconnected',
  phone_number text,
  profile_name text,
  profile_pic_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT (id, tenant_id, uazapi_instance_id, instance_name, status, phone_number, profile_name, profile_pic_url, created_at, updated_at)
  ON public.whatsapp_instances TO authenticated;
GRANT ALL ON public.whatsapp_instances TO service_role;

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their whatsapp instance"
  ON public.whatsapp_instances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = whatsapp_instances.tenant_id
        AND ut.status = 'active'
    )
    OR public.has_role(auth.uid(), 'master'::app_role)
  );

DROP TRIGGER IF EXISTS trg_whatsapp_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER trg_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_uazapi_instance_id
  ON public.whatsapp_instances(uazapi_instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_phone
  ON public.whatsapp_instances(phone_number);
