
-- 1. Columns on feed_post_comments
ALTER TABLE public.feed_post_comments
  ADD COLUMN IF NOT EXISTS mentions uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mention_all boolean NOT NULL DEFAULT false;

-- 2. New table: feed_comment_reactions
CREATE TABLE IF NOT EXISTS public.feed_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.feed_post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  servidor_id uuid NOT NULL,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_comment_reactions TO authenticated;
GRANT ALL ON public.feed_comment_reactions TO service_role;

ALTER TABLE public.feed_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fcr_read_tenant" ON public.feed_comment_reactions
  FOR SELECT TO authenticated
  USING (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "fcr_insert_own" ON public.feed_comment_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.is_master(auth.uid()) OR servidor_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "fcr_delete_own" ON public.feed_comment_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS feed_comment_reactions_comment_id_idx ON public.feed_comment_reactions(comment_id);

-- 3. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_comment_reactions;

-- 4. Notification trigger for new comments
CREATE OR REPLACE FUNCTION public.notify_feed_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author uuid;
  v_post_content text;
  v_commenter_name text;
  v_parent_author uuid;
  v_is_privileged boolean;
  v_member RECORD;
  v_uid uuid;
  v_preview text;
BEGIN
  SELECT author_id, content INTO v_post_author, v_post_content
  FROM public.feed_posts WHERE id = NEW.post_id;

  SELECT COALESCE(name, email, 'Alguém') INTO v_commenter_name
  FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  IF v_commenter_name IS NULL THEN v_commenter_name := 'Alguém'; END IF;

  v_preview := left(COALESCE(NEW.content, ''), 120);

  -- Notify post author when comment is on a top-level comment
  IF NEW.parent_id IS NULL AND v_post_author IS NOT NULL AND v_post_author <> NEW.user_id THEN
    PERFORM public.create_notification(
      v_post_author,
      v_commenter_name || ' comentou na sua publicação',
      v_preview,
      'feed_comment',
      '/home?post=' || NEW.post_id::text,
      jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'actor_id', NEW.user_id),
      NEW.servidor_id
    );
  END IF;

  -- Notify parent comment author on reply
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_author FROM public.feed_post_comments WHERE id = NEW.parent_id;
    IF v_parent_author IS NOT NULL AND v_parent_author <> NEW.user_id THEN
      PERFORM public.create_notification(
        v_parent_author,
        v_commenter_name || ' respondeu seu comentário',
        v_preview,
        'feed_reply',
        '/home?post=' || NEW.post_id::text,
        jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'parent_id', NEW.parent_id, 'actor_id', NEW.user_id),
        NEW.servidor_id
      );
    END IF;
  END IF;

  -- Mentions
  IF NEW.mentions IS NOT NULL AND array_length(NEW.mentions, 1) > 0 THEN
    FOREACH v_uid IN ARRAY NEW.mentions LOOP
      IF v_uid <> NEW.user_id THEN
        PERFORM public.create_notification(
          v_uid,
          v_commenter_name || ' te mencionou em um comentário',
          v_preview,
          'feed_mention',
          '/home?post=' || NEW.post_id::text,
          jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'actor_id', NEW.user_id),
          NEW.servidor_id
        );
      END IF;
    END LOOP;
  END IF;

  -- @todos (only if commenter is ceo/admin/master)
  IF NEW.mention_all = true THEN
    v_is_privileged := public.is_master(NEW.user_id) OR public.has_role(NEW.user_id, 'ceo'::app_role) OR public.has_role(NEW.user_id, 'admin'::app_role);
    IF v_is_privileged THEN
      FOR v_member IN
        SELECT user_id FROM public.profiles
        WHERE company_id = NEW.servidor_id AND is_active = true AND user_id <> NEW.user_id
      LOOP
        PERFORM public.create_notification(
          v_member.user_id,
          v_commenter_name || ' mencionou @todos',
          v_preview,
          'feed_mention',
          '/home?post=' || NEW.post_id::text,
          jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'actor_id', NEW.user_id, 'mention_all', true),
          NEW.servidor_id
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_feed_comment ON public.feed_post_comments;
CREATE TRIGGER trg_notify_feed_comment
AFTER INSERT ON public.feed_post_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_feed_comment();

-- 5. Notification trigger for post reactions
CREATE OR REPLACE FUNCTION public.notify_feed_post_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author uuid;
  v_actor_name text;
  v_servidor uuid;
BEGIN
  SELECT author_id, servidor_id INTO v_author, v_servidor FROM public.feed_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(name, email, 'Alguém') INTO v_actor_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  IF v_actor_name IS NULL THEN v_actor_name := 'Alguém'; END IF;

  PERFORM public.create_notification(
    v_author,
    v_actor_name || ' reagiu ' || COALESCE(NEW.emoji, '❤️') || ' na sua publicação',
    '',
    'feed_reaction',
    '/home?post=' || NEW.post_id::text,
    jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id, 'emoji', NEW.emoji),
    v_servidor
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_feed_post_reaction ON public.feed_post_reactions;
CREATE TRIGGER trg_notify_feed_post_reaction
AFTER INSERT ON public.feed_post_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_feed_post_reaction();

-- 6. Notification trigger for comment reactions
CREATE OR REPLACE FUNCTION public.notify_feed_comment_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_author uuid;
  v_post_id uuid;
  v_actor_name text;
BEGIN
  SELECT user_id, post_id INTO v_comment_author, v_post_id FROM public.feed_post_comments WHERE id = NEW.comment_id;
  IF v_comment_author IS NULL OR v_comment_author = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(name, email, 'Alguém') INTO v_actor_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  IF v_actor_name IS NULL THEN v_actor_name := 'Alguém'; END IF;

  PERFORM public.create_notification(
    v_comment_author,
    v_actor_name || ' curtiu seu comentário',
    '',
    'feed_comment_reaction',
    '/home?post=' || v_post_id::text,
    jsonb_build_object('post_id', v_post_id, 'comment_id', NEW.comment_id, 'actor_id', NEW.user_id, 'emoji', NEW.emoji),
    NEW.servidor_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_feed_comment_reaction ON public.feed_comment_reactions;
CREATE TRIGGER trg_notify_feed_comment_reaction
AFTER INSERT ON public.feed_comment_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_feed_comment_reaction();
