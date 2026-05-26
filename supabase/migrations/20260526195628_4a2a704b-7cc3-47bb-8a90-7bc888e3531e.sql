CREATE TABLE public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  recipients text NOT NULL DEFAULT 'all',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_posts TO authenticated;
GRANT ALL ON public.feed_posts TO service_role;

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view posts in their company"
ON public.feed_posts FOR SELECT TO authenticated
USING (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users create their own posts in their company"
ON public.feed_posts FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid())));

CREATE POLICY "Users update their own posts"
ON public.feed_posts FOR UPDATE TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "Users delete their own posts or admins delete any"
ON public.feed_posts FOR DELETE TO authenticated
USING (author_id = auth.uid() OR is_master(auth.uid()) OR is_admin(auth.uid()));

CREATE INDEX idx_feed_posts_servidor_created ON public.feed_posts(servidor_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_feed_posts_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_feed_posts_updated_at
BEFORE UPDATE ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION public.tg_feed_posts_set_updated_at();