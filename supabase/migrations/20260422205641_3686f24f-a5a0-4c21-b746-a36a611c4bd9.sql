CREATE OR REPLACE FUNCTION public.tg_sync_paddle_seats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_url text;
  v_anon text;
BEGIN
  v_tenant := COALESCE(NEW.company_id, OLD.company_id);
  IF v_tenant IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Skip if no paddle subscription exists for this tenant
  IF NOT EXISTS (SELECT 1 FROM public.paddle_subscriptions WHERE tenant_id = v_tenant) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Fire-and-forget call to edge function via pg_net (if available)
  BEGIN
    v_url := 'https://nglwgzknqgihlbkdnflu.supabase.co/functions/v1/paddle-update-seats';
    PERFORM net.http_post(
      url := v_url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('tenantId', v_tenant)
    );
  EXCEPTION WHEN OTHERS THEN
    -- pg_net not available or call failed — silently skip; manual recompute still possible
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_paddle_seats ON public.profiles;
CREATE TRIGGER profiles_sync_paddle_seats
AFTER INSERT OR UPDATE OF is_active, status OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_paddle_seats();