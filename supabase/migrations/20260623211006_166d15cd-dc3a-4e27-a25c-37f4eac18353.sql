-- Revoke direct SELECT on companies sensitive secret columns from regular users.
-- These secrets must only be accessed via SECURITY DEFINER functions
-- (get_company_credentials, get_company_webhook_config) which enforce admin/CEO/master gating.

REVOKE SELECT (
  zapi_token,
  zapi_client_token,
  zapi_instance_id,
  webhook_token,
  zapi_webhook_on_send,
  zapi_webhook_on_receive,
  zapi_webhook_on_disconnect,
  zapi_webhook_on_connect,
  zapi_webhook_chat_presence,
  zapi_webhook_message_status,
  zapi_webhook_notify_me
) ON public.companies FROM authenticated;

REVOKE SELECT (
  zapi_token,
  zapi_client_token,
  zapi_instance_id,
  webhook_token,
  zapi_webhook_on_send,
  zapi_webhook_on_receive,
  zapi_webhook_on_disconnect,
  zapi_webhook_on_connect,
  zapi_webhook_chat_presence,
  zapi_webhook_message_status,
  zapi_webhook_notify_me
) ON public.companies FROM anon;

-- service_role keeps full access (used by edge functions and SECURITY DEFINER RPCs).
GRANT ALL ON public.companies TO service_role;