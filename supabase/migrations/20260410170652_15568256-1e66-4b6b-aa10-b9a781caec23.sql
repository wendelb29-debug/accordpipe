
-- Add webhook_token column to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS webhook_token text UNIQUE;

-- Backfill existing companies with unique tokens
UPDATE public.companies
SET webhook_token = encode(extensions.digest(gen_random_uuid()::text || id::text || now()::text, 'sha256'), 'hex')
WHERE webhook_token IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.companies
  ALTER COLUMN webhook_token SET NOT NULL,
  ALTER COLUMN webhook_token SET DEFAULT encode(extensions.digest(gen_random_uuid()::text, 'sha256'), 'hex');

-- Function to resolve tenant by webhook token (public, no auth needed for webhook endpoints)
CREATE OR REPLACE FUNCTION public.resolve_tenant_by_webhook_token(p_token text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.companies WHERE webhook_token = p_token LIMIT 1;
$$;
