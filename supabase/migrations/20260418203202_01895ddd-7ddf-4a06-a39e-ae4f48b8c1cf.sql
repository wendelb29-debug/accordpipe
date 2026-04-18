ALTER TABLE public.tenant_whatsapp_integrations
  ADD COLUMN IF NOT EXISTS webhook_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS webhook_url text,
  ADD COLUMN IF NOT EXISTS webhook_url_final text,
  ADD COLUMN IF NOT EXISTS add_events_in_url boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS add_message_types_in_url boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listen_events text NOT NULL DEFAULT 'messages',
  ADD COLUMN IF NOT EXISTS exclude_events text NOT NULL DEFAULT 'wasSentByApi',
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS last_webhook_test_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_webhook_test_status text;