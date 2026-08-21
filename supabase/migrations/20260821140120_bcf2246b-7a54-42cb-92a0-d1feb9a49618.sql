-- 1. Ensure RLS is correct for activity_reminders
DROP POLICY IF EXISTS "Users view own reminders" ON public.activity_reminders;
DROP POLICY IF EXISTS "Users insert own reminders" ON public.activity_reminders;
DROP POLICY IF EXISTS "Users update own reminders" ON public.activity_reminders;
DROP POLICY IF EXISTS "Users delete own reminders" ON public.activity_reminders;

CREATE POLICY "Users view own reminders" ON public.activity_reminders
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own reminders" ON public.activity_reminders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own reminders" ON public.activity_reminders
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own reminders" ON public.activity_reminders
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 2. Trigger to cleanup reminders when activity is deleted or status changes
CREATE OR REPLACE FUNCTION public.cleanup_activity_reminders()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.activity_reminders WHERE activity_id = OLD.id;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If activity is no longer planned, remove pending reminders
    IF NEW.status IS DISTINCT FROM 'planned' AND NEW.status IS NOT NULL THEN
      DELETE FROM public.activity_reminders WHERE activity_id = NEW.id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_cleanup_activity_reminders ON public.crm_lead_activities;
CREATE TRIGGER tr_cleanup_activity_reminders
AFTER UPDATE OR DELETE ON public.crm_lead_activities
FOR EACH ROW EXECUTE FUNCTION public.cleanup_activity_reminders();

-- 3. Grant permissions for service_role to manage reminders
GRANT ALL ON public.activity_reminders TO service_role;
