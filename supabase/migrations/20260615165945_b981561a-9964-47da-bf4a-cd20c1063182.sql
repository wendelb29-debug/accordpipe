
-- 1) Notify followers when a tracked user creates a new post
CREATE OR REPLACE FUNCTION public.notify_user_follow_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_name text;
  v_preview text;
  v_follower RECORD;
BEGIN
  IF NEW.author_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(name, email, 'Alguém') INTO v_actor_name
  FROM public.profiles WHERE user_id = NEW.author_id LIMIT 1;
  IF v_actor_name IS NULL THEN v_actor_name := 'Alguém'; END IF;

  v_preview := left(COALESCE(NEW.content, ''), 120);

  FOR v_follower IN
    SELECT follower_id FROM public.user_follows
    WHERE following_id = NEW.author_id
      AND servidor_id = NEW.servidor_id
  LOOP
    PERFORM public.create_notification(
      v_follower.follower_id,
      v_actor_name || ' publicou no feed',
      v_preview,
      'feed_user_follow_post',
      '/home?post=' || NEW.id::text,
      jsonb_build_object('post_id', NEW.id, 'actor_id', NEW.author_id),
      NEW.servidor_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_user_follow_new_post ON public.feed_posts;
CREATE TRIGGER trg_notify_user_follow_new_post
AFTER INSERT ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION public.notify_user_follow_new_post();

-- 2) Extend comment notifier to include user-followers of the actor
CREATE OR REPLACE FUNCTION public.notify_feed_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  v_follower RECORD;
  v_user_follower RECORD;
  v_notified uuid[];
BEGIN
  SELECT author_id, content INTO v_post_author, v_post_content
  FROM public.feed_posts WHERE id = NEW.post_id;

  SELECT COALESCE(name, email, 'Alguém') INTO v_commenter_name
  FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  IF v_commenter_name IS NULL THEN v_commenter_name := 'Alguém'; END IF;

  v_preview := left(COALESCE(NEW.content, ''), 120);
  v_notified := ARRAY[]::uuid[];

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
    v_notified := v_notified || v_post_author;
  END IF;

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
      v_notified := v_notified || v_parent_author;
    END IF;
  END IF;

  IF NEW.mentions IS NOT NULL AND array_length(NEW.mentions, 1) > 0 THEN
    FOREACH v_uid IN ARRAY NEW.mentions LOOP
      IF v_uid <> NEW.user_id AND NOT (v_uid = ANY(v_notified)) THEN
        PERFORM public.create_notification(
          v_uid,
          v_commenter_name || ' te mencionou em um comentário',
          v_preview,
          'feed_mention',
          '/home?post=' || NEW.post_id::text,
          jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'actor_id', NEW.user_id),
          NEW.servidor_id
        );
        v_notified := v_notified || v_uid;
      END IF;
    END LOOP;
  END IF;

  IF NEW.mention_all = true THEN
    v_is_privileged := public.is_master(NEW.user_id) OR public.has_role(NEW.user_id, 'ceo'::app_role) OR public.has_role(NEW.user_id, 'admin'::app_role);
    IF v_is_privileged THEN
      FOR v_member IN
        SELECT user_id FROM public.profiles
        WHERE company_id = NEW.servidor_id AND is_active = true AND user_id <> NEW.user_id
      LOOP
        IF NOT (v_member.user_id = ANY(v_notified)) THEN
          PERFORM public.create_notification(
            v_member.user_id,
            v_commenter_name || ' mencionou @todos',
            v_preview,
            'feed_mention',
            '/home?post=' || NEW.post_id::text,
            jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'actor_id', NEW.user_id, 'mention_all', true),
            NEW.servidor_id
          );
          v_notified := v_notified || v_member.user_id;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Followers of the post
  FOR v_follower IN
    SELECT user_id FROM public.feed_post_follows WHERE post_id = NEW.post_id
  LOOP
    IF v_follower.user_id <> NEW.user_id AND NOT (v_follower.user_id = ANY(v_notified)) THEN
      PERFORM public.create_notification(
        v_follower.user_id,
        v_commenter_name || ' comentou em uma publicação que você segue',
        v_preview,
        'feed_follow_activity',
        '/home?post=' || NEW.post_id::text,
        jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'actor_id', NEW.user_id),
        NEW.servidor_id
      );
      v_notified := v_notified || v_follower.user_id;
    END IF;
  END LOOP;

  -- Followers of the commenter (user-follow)
  FOR v_user_follower IN
    SELECT follower_id FROM public.user_follows
    WHERE following_id = NEW.user_id AND servidor_id = NEW.servidor_id
  LOOP
    IF v_user_follower.follower_id <> NEW.user_id AND NOT (v_user_follower.follower_id = ANY(v_notified)) THEN
      PERFORM public.create_notification(
        v_user_follower.follower_id,
        v_commenter_name || ' comentou em uma publicação',
        v_preview,
        'feed_user_follow_activity',
        '/home?post=' || NEW.post_id::text,
        jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'actor_id', NEW.user_id),
        NEW.servidor_id
      );
      v_notified := v_notified || v_user_follower.follower_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3) Extend reaction notifier to include user-followers of the actor
CREATE OR REPLACE FUNCTION public.notify_feed_post_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_author uuid;
  v_actor_name text;
  v_servidor uuid;
  v_follower RECORD;
  v_user_follower RECORD;
  v_notified uuid[];
BEGIN
  SELECT author_id, servidor_id INTO v_author, v_servidor FROM public.feed_posts WHERE id = NEW.post_id;
  IF v_author IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(name, email, 'Alguém') INTO v_actor_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  IF v_actor_name IS NULL THEN v_actor_name := 'Alguém'; END IF;

  v_notified := ARRAY[]::uuid[];

  IF v_author <> NEW.user_id THEN
    PERFORM public.create_notification(
      v_author,
      v_actor_name || ' reagiu ' || COALESCE(NEW.emoji, '❤️') || ' na sua publicação',
      '',
      'feed_reaction',
      '/home?post=' || NEW.post_id::text,
      jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id, 'emoji', NEW.emoji),
      v_servidor
    );
    v_notified := v_notified || v_author;
  END IF;

  FOR v_follower IN
    SELECT user_id FROM public.feed_post_follows WHERE post_id = NEW.post_id
  LOOP
    IF v_follower.user_id <> NEW.user_id AND NOT (v_follower.user_id = ANY(v_notified)) THEN
      PERFORM public.create_notification(
        v_follower.user_id,
        v_actor_name || ' reagiu ' || COALESCE(NEW.emoji, '❤️') || ' em uma publicação que você segue',
        '',
        'feed_follow_activity',
        '/home?post=' || NEW.post_id::text,
        jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id, 'emoji', NEW.emoji),
        v_servidor
      );
      v_notified := v_notified || v_follower.user_id;
    END IF;
  END LOOP;

  FOR v_user_follower IN
    SELECT follower_id FROM public.user_follows
    WHERE following_id = NEW.user_id AND servidor_id = v_servidor
  LOOP
    IF v_user_follower.follower_id <> NEW.user_id AND NOT (v_user_follower.follower_id = ANY(v_notified)) THEN
      PERFORM public.create_notification(
        v_user_follower.follower_id,
        v_actor_name || ' reagiu ' || COALESCE(NEW.emoji, '❤️') || ' em uma publicação',
        '',
        'feed_user_follow_activity',
        '/home?post=' || NEW.post_id::text,
        jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id, 'emoji', NEW.emoji),
        v_servidor
      );
      v_notified := v_notified || v_user_follower.follower_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
