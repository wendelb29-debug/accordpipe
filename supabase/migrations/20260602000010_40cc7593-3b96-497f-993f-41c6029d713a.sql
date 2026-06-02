CREATE TABLE IF NOT EXISTS public.collab_message_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid NOT NULL REFERENCES public.collab_messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  servidor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_message_favorites TO authenticated;
GRANT ALL ON public.collab_message_favorites TO service_role;

ALTER TABLE public.collab_message_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fav_select_own" ON public.collab_message_favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "fav_insert_own" ON public.collab_message_favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete_own" ON public.collab_message_favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_collab_fav_user_conv
  ON public.collab_message_favorites (user_id, conversation_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_message_favorites;