INSERT INTO storage.buckets (id, name, public) VALUES ('user-signatures', 'user-signatures', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads to user-signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-signatures');

CREATE POLICY "Allow public read of user-signatures"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'user-signatures');

CREATE POLICY "Allow users to update own user-signatures"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'user-signatures');

CREATE POLICY "Allow users to delete own user-signatures"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-signatures');