
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- The "Admins can insert notifications" policy is sufficient for admin-triggered notifications.
-- For system/trigger-based notifications, we'll use a SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type text DEFAULT 'info',
  _link text DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
  VALUES (_user_id, _title, _message, _type, _link, _metadata)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
