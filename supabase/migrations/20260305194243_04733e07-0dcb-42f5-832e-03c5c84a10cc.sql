
-- Fix 1: Replace the open contracts SELECT policy
DROP POLICY IF EXISTS "Public can view contracts by signing token" ON public.contracts;

CREATE POLICY "Authenticated can view contracts"
ON public.contracts FOR SELECT TO authenticated
USING (
  is_master(auth.uid())
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'operador')
  OR has_role(auth.uid(), 'leitura')
);

-- Fix 2: Restrict signatures bucket uploads to authenticated users + add anon role for contract signing edge function
DROP POLICY IF EXISTS "Anyone can upload signatures" ON storage.objects;

CREATE POLICY "Authenticated users can upload signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signatures');

-- Also allow the service role (edge function) to upload
CREATE POLICY "Service role can upload signatures"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'signatures');
