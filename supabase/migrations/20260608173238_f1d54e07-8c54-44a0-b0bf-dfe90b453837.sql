
CREATE OR REPLACE FUNCTION public.handle_new_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id    uuid;
    v_provider   text;
BEGIN
    SELECT user_id, provider
      INTO v_user_id, v_provider
    FROM public.email_accounts
    WHERE id = NEW.account_id;

    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF (NEW.received_at > now() - interval '30 minutes') THEN
        INSERT INTO public.notifications (
            user_id, servidor_id, title, message, type, link, metadata
        ) VALUES (
            v_user_id,
            NEW.servidor_id,
            COALESCE(NEW.from_name, NEW.from_email),
            NEW.subject,
            'email',
            '/email',
            jsonb_build_object(
                'email_id',   NEW.id,
                'account_id', NEW.account_id,
                'from',       NEW.from_email,
                'provider',   v_provider
            )
        );
    END IF;
    RETURN NEW;
END;
$$;
