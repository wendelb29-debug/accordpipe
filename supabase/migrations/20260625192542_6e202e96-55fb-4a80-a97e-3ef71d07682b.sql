CREATE OR REPLACE FUNCTION public.notify_feed_post_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
  v_actor_id uuid;
  v_author_id uuid;
  v_servidor_id uuid;
  v_actor_name text;
  v_verb text;
  v_recipient uuid;
BEGIN
  v_post_id := NEW.post_id;
  v_actor_id := NEW.user_id;

  IF TG_TABLE_NAME = 'feed_post_reactions' THEN
    v_verb := ' curtiu uma publicação';
  ELSIF TG_TABLE_NAME = 'feed_post_comments' THEN
    v_verb := ' comentou uma publicação';
  ELSE
    v_verb := ' interagiu com uma publicação';
  END IF;

  SELECT fp.user_id, fp.servidor_id
    INTO v_author_id, v_servidor_id
  FROM public.feed_posts fp
  WHERE fp.id = v_post_id;

  IF v_author_id IS NULL OR v_servidor_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.name, 'Alguém') INTO v_actor_name
  FROM public.profiles p
  WHERE p.user_id = v_actor_id
  LIMIT 1;

  IF v_actor_name IS NULL THEN
    v_actor_name := 'Alguém';
  END IF;

  FOR v_recipient IN
    SELECT DISTINCT uid FROM (
      SELECT user_id AS uid FROM public.feed_post_follows WHERE post_id = v_post_id
      UNION
      SELECT v_author_id AS uid
    ) recipients
    WHERE uid IS NOT NULL AND uid <> v_actor_id
  LOOP
    INSERT INTO public.notifications (
      servidor_id, user_id, type, title, message, link, metadata
    ) VALUES (
      v_servidor_id,
      v_recipient,
      'feed_follow',
      'Atividade em publicação que você segue',
      v_actor_name || v_verb,
      '/home',
      jsonb_build_object('post_id', v_post_id, 'actor_id', v_actor_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_on_reaction ON public.feed_post_reactions;
CREATE TRIGGER trg_notify_followers_on_reaction
AFTER INSERT ON public.feed_post_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_feed_post_followers();

DROP TRIGGER IF EXISTS trg_notify_followers_on_comment ON public.feed_post_comments;
CREATE TRIGGER trg_notify_followers_on_comment
AFTER INSERT ON public.feed_post_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_feed_post_followers();