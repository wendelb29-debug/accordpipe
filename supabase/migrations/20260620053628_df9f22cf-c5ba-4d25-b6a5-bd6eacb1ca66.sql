
CREATE TABLE IF NOT EXISTS public.cloud_drive_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  servidor_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google','microsoft')),
  email TEXT,
  display_name TEXT,
  provider_user_id TEXT,
  oauth_tokens JSONB,
  oauth_scopes TEXT,
  quota_total BIGINT,
  quota_used BIGINT,
  quota_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, servidor_id, provider, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_drive_accounts TO authenticated;
GRANT ALL ON public.cloud_drive_accounts TO service_role;

ALTER TABLE public.cloud_drive_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cloud drive accounts"
  ON public.cloud_drive_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_cloud_drive_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_cloud_drive_accounts_updated_at ON public.cloud_drive_accounts;
CREATE TRIGGER trg_cloud_drive_accounts_updated_at
BEFORE UPDATE ON public.cloud_drive_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_cloud_drive_accounts_updated_at();
