ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS zapi_webhook_on_send TEXT,
  ADD COLUMN IF NOT EXISTS zapi_webhook_on_disconnect TEXT,
  ADD COLUMN IF NOT EXISTS zapi_webhook_on_receive TEXT,
  ADD COLUMN IF NOT EXISTS zapi_webhook_chat_presence TEXT,
  ADD COLUMN IF NOT EXISTS zapi_webhook_message_status TEXT,
  ADD COLUMN IF NOT EXISTS zapi_webhook_on_connect TEXT,
  ADD COLUMN IF NOT EXISTS zapi_webhook_notify_me BOOLEAN DEFAULT false;