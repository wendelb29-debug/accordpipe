
CREATE TABLE public.feed_post_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  servidor_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX idx_feed_post_views_post ON public.feed_post_views(post_id);
CREATE INDEX idx_feed_post_views_user ON public.feed_post_views(user_id);

GRANT SELECT, INSERT ON public.feed_post_views TO authenticated;
GRANT ALL ON public.feed_post_views TO service_role;

ALTER TABLE public.feed_post_views ENABLE ROW LEVEL SECURITY;

-- A user can register their own view, only within their tenant
CREATE POLICY "Users insert own view in tenant"
ON public.feed_post_views FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND servidor_id = public.get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.feed_posts p
    WHERE p.id = post_id AND p.servidor_id = public.get_user_company_id(auth.uid())
  )
);

-- The author of the post can see who viewed it; users can see their own row (for idempotency checks)
CREATE POLICY "Author sees views, user sees own"
ON public.feed_post_views FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.feed_posts p
    WHERE p.id = post_id
      AND p.author_id = auth.uid()
  )
);
