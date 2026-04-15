
-- 1. Make sensitive buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('signatures', 'contract-pdfs', 'user-signatures');

-- 2. Drop existing overly permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can view signatures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view contract-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view contract-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Public can read contract-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- 3. Authenticated users can read files from contract-pdfs bucket
CREATE POLICY "Authenticated can read contract-pdfs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contract-pdfs');

-- 4. Authenticated users can read files from signatures bucket
CREATE POLICY "Authenticated can read signatures"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'signatures');

-- 5. Users can only read their own files from user-signatures bucket
CREATE POLICY "Users can read own user-signatures"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'user-signatures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Service role can read all (for edge functions generating signed URLs)
CREATE POLICY "Service role can read contract-pdfs"
ON storage.objects FOR SELECT TO service_role
USING (bucket_id = 'contract-pdfs');

CREATE POLICY "Service role can read signatures"
ON storage.objects FOR SELECT TO service_role
USING (bucket_id = 'signatures');

CREATE POLICY "Service role can read user-signatures"
ON storage.objects FOR SELECT TO service_role
USING (bucket_id = 'user-signatures');
