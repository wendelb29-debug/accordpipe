
-- 1) feed_post_follows: restrict SELECT to same tenant
DROP POLICY IF EXISTS "fpf_read_tenant" ON public.feed_post_follows;
CREATE POLICY "fpf_read_tenant" ON public.feed_post_follows
  FOR SELECT TO authenticated
  USING (
    is_master(auth.uid())
    OR (servidor_id = get_user_company_id(auth.uid()))
  );

-- 2) collab_message_favorites: enforce conversation membership on INSERT
DROP POLICY IF EXISTS "fav_insert_own" ON public.collab_message_favorites;
CREATE POLICY "fav_insert_own" ON public.collab_message_favorites
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.collab_messages m
      WHERE m.id = collab_message_favorites.message_id
        AND public.is_collab_member(m.conversation_id, auth.uid())
    )
  );
