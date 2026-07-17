-- user-avatars bucket policies: each user manages files under their own {user_id}/ folder
DROP POLICY IF EXISTS "user_avatars_select_own" ON storage.objects;
CREATE POLICY "user_avatars_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "user_avatars_insert_own" ON storage.objects;
CREATE POLICY "user_avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "user_avatars_update_own" ON storage.objects;
CREATE POLICY "user_avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "user_avatars_delete_own" ON storage.objects;
CREATE POLICY "user_avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);