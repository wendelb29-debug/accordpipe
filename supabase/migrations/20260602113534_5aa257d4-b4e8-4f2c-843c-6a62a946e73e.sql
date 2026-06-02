
CREATE POLICY "Collab avatars are viewable by authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'collab-avatars');

CREATE POLICY "Authenticated users can upload collab avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'collab-avatars');

CREATE POLICY "Users can update their own collab avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'collab-avatars' AND owner = auth.uid());

CREATE POLICY "Users can delete their own collab avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'collab-avatars' AND owner = auth.uid());
