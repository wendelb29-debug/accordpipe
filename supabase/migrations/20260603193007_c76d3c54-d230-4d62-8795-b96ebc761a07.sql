CREATE OR REPLACE FUNCTION public.handle_new_email_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_is_initial_sync BOOLEAN;
BEGIN
    -- Busca o dono da conta
    SELECT user_id INTO v_user_id FROM public.email_accounts WHERE id = NEW.account_id;
    
    -- Verifica se é o sincronismo inicial (se o last_synced_at for muito antigo ou nulo)
    -- Mas uma forma mais simples: só notificar se a mensagem foi recebida recentemente (últimos 30 min)
    -- e se a inserção no banco ocorreu agora.
    IF (NEW.received_at > now() - interval '30 minutes') THEN
        INSERT INTO public.notifications (
            user_id,
            servidor_id,
            title,
            message,
            type,
            link,
            metadata
        ) VALUES (
            v_user_id,
            NEW.servidor_id,
            COALESCE(NEW.from_name, NEW.from_email),
            NEW.subject,
            'email',
            '/email',
            jsonb_build_object(
                'email_id', NEW.id,
                'account_id', NEW.account_id,
                'from', NEW.from_email
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_email_insert ON public.email_messages;
CREATE TRIGGER on_new_email_insert
AFTER INSERT ON public.email_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_email_notification();