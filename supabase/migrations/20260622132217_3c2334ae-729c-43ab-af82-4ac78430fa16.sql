
-- 1) Companies: revoke client SELECT on secret columns
REVOKE SELECT (zapi_token, zapi_client_token, webhook_token) ON public.companies FROM authenticated;
REVOKE SELECT (zapi_token, zapi_client_token, webhook_token) ON public.companies FROM anon;

-- 2) marketing_email_connections: revoke client SELECT on OAuth tokens
REVOKE SELECT (access_token, refresh_token) ON public.marketing_email_connections FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.marketing_email_connections FROM anon;

-- 3) email_accounts: revoke client SELECT on token blobs and imap config
REVOKE SELECT (oauth_tokens, imap_config) ON public.email_accounts FROM authenticated;
REVOKE SELECT (oauth_tokens, imap_config) ON public.email_accounts FROM anon;

-- 4) cloud_drive_accounts: revoke client SELECT on token blob
REVOKE SELECT (oauth_tokens) ON public.cloud_drive_accounts FROM authenticated;
REVOKE SELECT (oauth_tokens) ON public.cloud_drive_accounts FROM anon;

-- 5) RPC: boolean check whether the active tenant has a webhook_token configured
--    Any authenticated member of the company can call (does not reveal the token itself)
CREATE OR REPLACE FUNCTION public.has_company_webhook_token(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id
      AND c.webhook_token IS NOT NULL
      AND public.get_user_company_id(auth.uid()) = c.id
  );
$$;

REVOKE ALL ON FUNCTION public.has_company_webhook_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_company_webhook_token(uuid) TO authenticated;

-- 6) Remove email_accounts and email_messages from Supabase Realtime publication
--    to avoid broadcasting OAuth tokens / raw bodies over WebSocket.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'email_accounts') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.email_accounts';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'email_messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.email_messages';
  END IF;
END $$;
