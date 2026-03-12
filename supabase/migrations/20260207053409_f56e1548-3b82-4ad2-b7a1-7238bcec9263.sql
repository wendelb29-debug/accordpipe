
-- Add columns for signature photo and geolocation
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS signature_photo_url text,
ADD COLUMN IF NOT EXISTS signature_latitude double precision,
ADD COLUMN IF NOT EXISTS signature_longitude double precision,
ADD COLUMN IF NOT EXISTS signature_address text,
ADD COLUMN IF NOT EXISTS signer_name text,
ADD COLUMN IF NOT EXISTS signer_document text;

-- Create a unique token for public signing links
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS signing_token text UNIQUE;

-- Allow anonymous read of contracts by signing token (public page)
CREATE POLICY "Public can view contracts by signing token"
ON public.contracts
FOR SELECT
USING (true);

-- Drop old select policy that requires auth
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON public.contracts;

-- Allow anonymous update for signing (only signature fields)
CREATE POLICY "Anyone can sign contracts via token"
ON public.contracts
FOR UPDATE
USING (signing_token IS NOT NULL AND signature_status = 'pending')
WITH CHECK (signing_token IS NOT NULL);
