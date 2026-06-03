-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1) Trigger de notificação no sininho
CREATE OR REPLACE FUNCTION public.notify_new_email_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_servidor_id uuid;
  v_title       text;
  v_message     text;
BEGIN
  -- Só notifica mensagens não lidas que chegaram na INBOX
  IF NEW.is_read = true THEN
    RETURN NEW;
  END IF;
  IF NEW.folder IS NOT NULL AND LOWER(NEW.folder) <> 'inbox' THEN
    RETURN NEW;
  END IF;

  -- Pula sync histórico — só notifica mensagens recentes (≤ 1 hora)
  IF NEW.received_at IS NOT NULL AND NEW.received_at < (NOW() - INTERVAL '1 hour') THEN
    RETURN NEW;
  END IF;

  -- Recupera dono da conta de e-mail
  SELECT user_id, servidor_id
    INTO v_user_id, v_servidor_id
  FROM public.email_accounts
  WHERE id = NEW.account_id;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Monta título e mensagem
  v_title := 'Novo e-mail';
  v_message := COALESCE(
    NULLIF(TRIM(COALESCE(NEW.from_name, NEW.from_email)), '') || ': ' || COALESCE(NULLIF(NEW.subject, ''), '(sem assunto)'),
    'Você recebeu um novo e-mail'
  );

  -- Insere na tabela de notificações do Accord (sininho)
  INSERT INTO public.notifications (
    user_id,
    servidor_id,
    title,
    message,
    type,
    is_read,
    link,
    metadata
  ) VALUES (
    v_user_id,
    v_servidor_id,
    v_title,
    v_message,
    'email',
    false,
    '/email/' || NEW.account_id::text,
    jsonb_build_object(
      'message_id', NEW.id,
      'account_id', NEW.account_id,
      'from_email', NEW.from_email,
      'from_name', NEW.from_name,
      'subject', NEW.subject,
      'snippet', NEW.snippet,
      'received_at', NEW.received_at
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_email_message_trigger ON public.email_messages;
CREATE TRIGGER notify_new_email_message_trigger
AFTER INSERT ON public.email_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_email_message();

-- 2) Agendamento (pg_cron) chamando email-sync
SELECT cron.unschedule('email-sync-every-2-min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-sync-every-2-min');

SELECT cron.schedule(
  'email-sync-every-2-min',
  '*/2 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nglwgzknqgihlbkdnflu.supabase.co/functions/v1/email-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbHdnemtucWdpaGxia2RuZmx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY3MDE3NywiZXhwIjoyMDg5MjQ2MTc3fQ.b5aYiFxy8D16rl-g21854WbeCBTf86whN_wv60Vili4'
    ),
    body := '{"batch_all": true}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);