ALTER TABLE public.tenant_whatsapp_integrations
  ADD COLUMN IF NOT EXISTS connected_phone text,
  ADD COLUMN IF NOT EXISTS connection_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tenant_whatsapp_integrations.connection_status IS 'unknown | connected | disconnected | pending | invalid_credentials | webhook_not_configured';