
DROP POLICY IF EXISTS "Anyone can view signatures" ON storage.objects;
CREATE POLICY "Anyone can view signatures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-signatures' OR bucket_id = 'signatures');
