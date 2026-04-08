-- Allow any authenticated user to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.role() = 'authenticated'
);

-- Allow any authenticated user to update (upsert) their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.role() = 'authenticated'
);