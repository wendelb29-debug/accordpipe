
-- 1. Add servidor_id column (nullable first for backfill)
ALTER TABLE public.notifications ADD COLUMN servidor_id uuid REFERENCES public.companies(id);

-- 2. Backfill existing notifications with the user's company_id
UPDATE public.notifications n
SET servidor_id = (SELECT company_id FROM public.profiles WHERE user_id = n.user_id LIMIT 1)
WHERE servidor_id IS NULL;

-- 3. Make it NOT NULL after backfill
ALTER TABLE public.notifications ALTER COLUMN servidor_id SET NOT NULL;

-- 4. Add index for performance
CREATE INDEX idx_notifications_servidor_id ON public.notifications (servidor_id);

-- 5. Drop old RLS policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

-- 6. Create new tenant-isolated RLS policies
CREATE POLICY "Users can view own tenant notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  AND (
    servidor_id = get_user_company_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_master = true)
  )
);

CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  servidor_id IS NOT NULL
  AND (is_admin(auth.uid()) OR is_master(auth.uid()))
);

CREATE POLICY "Users can update own tenant notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  AND (
    servidor_id = get_user_company_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_master = true)
  )
);

CREATE POLICY "Users can delete own tenant notifications"
ON public.notifications FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  AND (
    servidor_id = get_user_company_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_master = true)
  )
);

-- 7. Update create_notification function to require servidor_id
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type text DEFAULT 'info'::text,
  _link text DEFAULT NULL::text,
  _metadata jsonb DEFAULT NULL::jsonb,
  _servidor_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _effective_servidor_id uuid;
BEGIN
  -- Use provided servidor_id, or fall back to user's company_id
  _effective_servidor_id := COALESCE(_servidor_id, get_user_company_id(_user_id));
  
  INSERT INTO public.notifications (user_id, title, message, type, link, metadata, servidor_id)
  VALUES (_user_id, _title, _message, _type, _link, _metadata, _effective_servidor_id)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
