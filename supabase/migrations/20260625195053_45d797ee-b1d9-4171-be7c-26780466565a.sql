
-- Revoke SELECT on sensitive secret columns of public.companies from authenticated/anon
-- These secrets (WhatsApp/Z-API tokens, webhook URLs) must only be readable by admins via
-- SECURITY DEFINER RPCs (e.g. get_company_webhook_config) or by service_role.

REVOKE SELECT (
  zapi_token,
  zapi_client_token,
  zapi_phone,
  zapi_instance_id,
  webhook_token,
  zapi_webhook_on_send,
  zapi_webhook_on_disconnect,
  zapi_webhook_on_receive,
  zapi_webhook_chat_presence,
  zapi_webhook_message_status,
  zapi_webhook_on_connect,
  zapi_webhook_notify_me
) ON public.companies FROM authenticated;

REVOKE SELECT (
  zapi_token,
  zapi_client_token,
  zapi_phone,
  zapi_instance_id,
  webhook_token,
  zapi_webhook_on_send,
  zapi_webhook_on_disconnect,
  zapi_webhook_on_receive,
  zapi_webhook_chat_presence,
  zapi_webhook_message_status,
  zapi_webhook_on_connect,
  zapi_webhook_notify_me
) ON public.companies FROM anon;

-- service_role keeps full access (edge functions / admin RPCs continue to work).
GRANT ALL ON public.companies TO service_role;
