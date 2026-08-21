CREATE OR REPLACE FUNCTION public.cleanup_activity_reminders()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.activity_reminders WHERE activity_id = OLD.id;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.status IS DISTINCT FROM 'planned' AND NEW.status IS NOT NULL THEN
      DELETE FROM public.activity_reminders WHERE activity_id = NEW.id;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;