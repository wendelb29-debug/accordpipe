
CREATE OR REPLACE FUNCTION public.notify_new_collab_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_title text;
  v_sender_name        text;
  v_reply_owner        uuid;
  v_member             RECORD;
  v_message_preview    text;
  v_notif_type         text;
  v_notif_title        text;
  v_notif_message      text;
  v_mentioned          jsonb;
  v_metadata           jsonb;
BEGIN
  IF NEW.is_system = true OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(title, 'Conversa')
    INTO v_conversation_title
  FROM public.collab_conversations
  WHERE id = NEW.conversation_id;

  SELECT COALESCE(name, email, 'Alguém')
    INTO v_sender_name
  FROM public.profiles
  WHERE user_id = NEW.sender_id
  LIMIT 1;
  IF v_sender_name IS NULL THEN v_sender_name := 'Alguém'; END IF;

  v_message_preview := COALESCE(
    NULLIF(TRIM(NEW.content), ''),
    CASE
      WHEN jsonb_array_length(COALESCE(NEW.attachments, '[]'::jsonb)) > 0
        THEN '📎 Enviou um anexo'
      ELSE '(mensagem vazia)'
    END
  );
  IF length(v_message_preview) > 80 THEN
    v_message_preview := left(v_message_preview, 77) || '...';
  END IF;

  IF NEW.reply_to_id IS NOT NULL THEN
    SELECT sender_id INTO v_reply_owner
    FROM public.collab_messages
    WHERE id = NEW.reply_to_id;
  END IF;

  v_mentioned := NULL;

  FOR v_member IN
    SELECT m.user_id
    FROM public.collab_members m
    WHERE m.conversation_id = NEW.conversation_id
      AND m.user_id <> NEW.sender_id
      AND COALESCE(m.is_muted, false) = false
  LOOP
    IF v_mentioned IS NOT NULL AND v_mentioned ? v_member.user_id::text THEN
      v_notif_type    := 'collab_mention';
      v_notif_title   := v_sender_name || ' te mencionou em ' || v_conversation_title;
      v_notif_message := v_message_preview;
    ELSIF v_reply_owner = v_member.user_id THEN
      v_notif_type    := 'collab_reply';
      v_notif_title   := v_sender_name || ' respondeu sua mensagem';
      v_notif_message := v_message_preview;
    ELSE
      v_notif_type    := 'collab_message';
      v_notif_title   := v_sender_name || ' · ' || v_conversation_title;
      v_notif_message := v_message_preview;
    END IF;

    v_metadata := jsonb_build_object(
      'message_id',      NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_id',       NEW.sender_id,
      'sender_name',     v_sender_name,
      'reply_to_id',     NEW.reply_to_id,
      'has_attachments', jsonb_array_length(COALESCE(NEW.attachments, '[]'::jsonb)) > 0
    );

    INSERT INTO public.notifications (
      user_id, servidor_id, title, message, type, is_read, link, metadata
    ) VALUES (
      v_member.user_id,
      (SELECT servidor_id FROM public.collab_conversations WHERE id = NEW.conversation_id),
      v_notif_title,
      v_notif_message,
      v_notif_type,
      false,
      '/collabs?conversation=' || NEW.conversation_id::text,
      v_metadata
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_collab_message_trigger ON public.collab_messages;
CREATE TRIGGER notify_new_collab_message_trigger
AFTER INSERT ON public.collab_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_collab_message();

-- Enquete (collab_polls)
CREATE OR REPLACE FUNCTION public.notify_new_collab_poll()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_name text;
  v_conv_title   text;
  v_servidor     uuid;
  v_member       RECORD;
BEGIN
  SELECT COALESCE(name, email, 'Alguém')
    INTO v_creator_name
  FROM public.profiles
  WHERE user_id = NEW.created_by
  LIMIT 1;
  IF v_creator_name IS NULL THEN v_creator_name := 'Alguém'; END IF;

  SELECT COALESCE(title, 'Conversa'), servidor_id
    INTO v_conv_title, v_servidor
  FROM public.collab_conversations
  WHERE id = NEW.conversation_id;

  FOR v_member IN
    SELECT user_id FROM public.collab_members
    WHERE conversation_id = NEW.conversation_id
      AND user_id <> NEW.created_by
      AND COALESCE(is_muted, false) = false
  LOOP
    INSERT INTO public.notifications (
      user_id, servidor_id, title, message, type, is_read, link, metadata
    ) VALUES (
      v_member.user_id,
      v_servidor,
      v_creator_name || ' criou uma enquete',
      COALESCE(NEW.question, '(sem pergunta)') || ' · em ' || v_conv_title,
      'collab_poll',
      false,
      '/collabs?conversation=' || NEW.conversation_id::text || '&poll=' || NEW.id::text,
      jsonb_build_object(
        'poll_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'creator_id', NEW.created_by,
        'creator_name', v_creator_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_collab_poll_trigger ON public.collab_polls;
CREATE TRIGGER notify_new_collab_poll_trigger
AFTER INSERT ON public.collab_polls
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_collab_poll();
