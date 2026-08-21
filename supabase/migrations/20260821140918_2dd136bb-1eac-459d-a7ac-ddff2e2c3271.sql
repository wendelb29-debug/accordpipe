-- ad_integrations: revoke direct read of plaintext credentials
REVOKE SELECT ON public.ad_integrations FROM anon, authenticated;
GRANT SELECT (id, servidor_id, provider, business_id, ad_account_id, page_id, connected_by, status, created_at, updated_at)
  ON public.ad_integrations TO authenticated;

-- company_api_credentials: revoke direct read of plaintext Zapi credentials
REVOKE SELECT ON public.company_api_credentials FROM anon, authenticated;
GRANT SELECT (id, company_id, zapi_instance_id, created_at, updated_at)
  ON public.company_api_credentials TO authenticated;

-- whatsapp_instances: revoke direct read of plaintext uazapi token
REVOKE SELECT ON public.whatsapp_instances FROM anon, authenticated;
GRANT SELECT (id, tenant_id, uazapi_instance_id, instance_name, status, phone_number, profile_name, profile_pic_url, created_at, updated_at, last_chats_sync_at)
  ON public.whatsapp_instances TO authenticated;

GRANT ALL ON public.ad_integrations TO service_role;
GRANT ALL ON public.company_api_credentials TO service_role;
GRANT ALL ON public.whatsapp_instances TO service_role;