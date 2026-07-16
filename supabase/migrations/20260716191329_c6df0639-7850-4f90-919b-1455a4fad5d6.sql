
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  lead_id UUID,
  wa_chatid TEXT NOT NULL,
  name TEXT,
  image_url TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_text TEXT,
  last_message_type TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_chats_tenant_chatid_unique UNIQUE (tenant_id, wa_chatid)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_tenant_last ON public.whatsapp_chats (tenant_id, last_message_at DESC);

GRANT SELECT ON public.whatsapp_chats TO authenticated;
GRANT ALL ON public.whatsapp_chats TO service_role;

ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view whatsapp chats"
  ON public.whatsapp_chats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = whatsapp_chats.tenant_id
        AND ut.status = 'active'
    )
    OR public.has_role(auth.uid(), 'master'::app_role)
  );

CREATE TRIGGER trg_whatsapp_chats_updated_at
  BEFORE UPDATE ON public.whatsapp_chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Webhook errors log ============
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  event_type TEXT,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_errors_tenant ON public.whatsapp_webhook_errors (tenant_id, created_at DESC);

GRANT SELECT ON public.whatsapp_webhook_errors TO authenticated;
GRANT ALL ON public.whatsapp_webhook_errors TO service_role;

ALTER TABLE public.whatsapp_webhook_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view whatsapp webhook errors"
  ON public.whatsapp_webhook_errors FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = whatsapp_webhook_errors.tenant_id
          AND ut.status = 'active'
          AND ut.role = ANY(ARRAY['admin','ceo'])
      )
      OR public.has_role(auth.uid(), 'master'::app_role)
    )
  );
