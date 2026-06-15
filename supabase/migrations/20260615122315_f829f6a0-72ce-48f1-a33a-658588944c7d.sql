
-- ────────────────────────────────────────────────
-- feed_post_reactions
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_post_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  servidor_id uuid NOT NULL,
  emoji       text NOT NULL DEFAULT '❤️',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feed_post_reactions_post_user_emoji_unique UNIQUE (post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_feed_post_reactions_post ON public.feed_post_reactions (post_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_post_reactions TO authenticated;
GRANT ALL ON public.feed_post_reactions TO service_role;

ALTER TABLE public.feed_post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_reactions_read_tenant" ON public.feed_post_reactions
  FOR SELECT TO authenticated
  USING (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid()));

CREATE POLICY "feed_reactions_insert_own" ON public.feed_post_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid())));

CREATE POLICY "feed_reactions_delete_own" ON public.feed_post_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_master(auth.uid()));

-- ────────────────────────────────────────────────
-- feed_post_comments
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_post_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  servidor_id uuid NOT NULL,
  content     text NOT NULL,
  parent_id   uuid REFERENCES public.feed_post_comments(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_post_comments_post ON public.feed_post_comments (post_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_post_comments TO authenticated;
GRANT ALL ON public.feed_post_comments TO service_role;

ALTER TABLE public.feed_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_comments_read_tenant" ON public.feed_post_comments
  FOR SELECT TO authenticated
  USING (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid()));

CREATE POLICY "feed_comments_insert_own" ON public.feed_post_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid())));

CREATE POLICY "feed_comments_delete_own_or_admin" ON public.feed_post_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_master(auth.uid()) OR is_admin(auth.uid()));

-- ────────────────────────────────────────────────
-- feed_post_saves
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_post_saves (
  post_id     uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  servidor_id uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_post_saves TO authenticated;
GRANT ALL ON public.feed_post_saves TO service_role;

ALTER TABLE public.feed_post_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_saves_owner" ON public.feed_post_saves
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ────────────────────────────────────────────────
-- user_follows
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id  uuid NOT NULL,
  following_id uuid NOT NULL,
  servidor_id  uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_follows_read_tenant" ON public.user_follows
  FOR SELECT TO authenticated
  USING (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid()));

CREATE POLICY "user_follows_insert_own" ON public.user_follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid() AND (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid())));

CREATE POLICY "user_follows_delete_own" ON public.user_follows
  FOR DELETE TO authenticated
  USING (follower_id = auth.uid());
