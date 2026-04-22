CREATE OR REPLACE FUNCTION public.tg_paddle_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;