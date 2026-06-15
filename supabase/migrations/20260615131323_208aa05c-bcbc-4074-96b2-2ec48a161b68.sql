
-- 1) Extend feed_posts
ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'mensagem',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS appreciation_to uuid,
  ADD COLUMN IF NOT EXISTS appreciation_kind text;

-- 2) Polls
CREATE TABLE IF NOT EXISTS public.feed_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  servidor_id uuid NOT NULL,
  question text NOT NULL,
  allow_multiple boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_polls TO authenticated;
GRANT ALL ON public.feed_polls TO service_role;
ALTER TABLE public.feed_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Polls viewable in same tenant" ON public.feed_polls FOR SELECT TO authenticated
  USING (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid()));
CREATE POLICY "Polls created by post author" ON public.feed_polls FOR INSERT TO authenticated
  WITH CHECK (servidor_id = get_user_company_id(auth.uid())
              AND EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid()));
CREATE POLICY "Polls updated by post author" ON public.feed_polls FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid()));
CREATE POLICY "Polls deleted by post author" ON public.feed_polls FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.author_id = auth.uid()));

-- 3) Poll options
CREATE TABLE IF NOT EXISTS public.feed_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.feed_polls(id) ON DELETE CASCADE,
  text text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feed_poll_options_poll ON public.feed_poll_options(poll_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_poll_options TO authenticated;
GRANT ALL ON public.feed_poll_options TO service_role;
ALTER TABLE public.feed_poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poll options viewable in same tenant" ON public.feed_poll_options FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feed_polls fp
                 WHERE fp.id = poll_id
                   AND (is_master(auth.uid()) OR fp.servidor_id = get_user_company_id(auth.uid()))));
CREATE POLICY "Poll options managed by author" ON public.feed_poll_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feed_polls fp
                 JOIN public.feed_posts p ON p.id = fp.post_id
                 WHERE fp.id = poll_id AND p.author_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.feed_polls fp
                      JOIN public.feed_posts p ON p.id = fp.post_id
                      WHERE fp.id = poll_id AND p.author_id = auth.uid()));

-- 4) Poll votes
CREATE TABLE IF NOT EXISTS public.feed_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.feed_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.feed_poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, option_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_feed_poll_votes_poll ON public.feed_poll_votes(poll_id);

GRANT SELECT, INSERT, DELETE ON public.feed_poll_votes TO authenticated;
GRANT ALL ON public.feed_poll_votes TO service_role;
ALTER TABLE public.feed_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poll votes viewable in same tenant" ON public.feed_poll_votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feed_polls fp
                 WHERE fp.id = poll_id
                   AND (is_master(auth.uid()) OR fp.servidor_id = get_user_company_id(auth.uid()))));
CREATE POLICY "Users vote as themselves" ON public.feed_poll_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.feed_polls fp
                          WHERE fp.id = poll_id
                            AND fp.servidor_id = get_user_company_id(auth.uid())));
CREATE POLICY "Users remove their own votes" ON public.feed_poll_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());
