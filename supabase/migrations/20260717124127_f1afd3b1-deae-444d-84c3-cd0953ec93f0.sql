-- Add columns to profiles for "Minha conta"
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+55',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS mobile_country_code text DEFAULT '+55',
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT jsonb_build_object(
    'queue_sla',        jsonb_build_object('app', true, 'email', true),
    'channels',         jsonb_build_object('app', true, 'email', true),
    'reports',          jsonb_build_object('app', true, 'email', true),
    'team',             jsonb_build_object('app', true, 'email', true),
    'contacts',         jsonb_build_object('app', true, 'email', false),
    'csat',             jsonb_build_object('app', true, 'email', true),
    'content_analysis', jsonb_build_object('app', true, 'email', false),
    'templates',        jsonb_build_object('app', true, 'email', true),
    'security',         jsonb_build_object('app', true, 'email', true)
  );

-- Backfill first/last from existing name
UPDATE public.profiles
   SET first_name = COALESCE(first_name, split_part(name, ' ', 1)),
       last_name  = COALESCE(last_name,
                             NULLIF(regexp_replace(name, '^\S+\s*', ''), ''))
 WHERE name IS NOT NULL
   AND (first_name IS NULL OR last_name IS NULL);

-- Backfill mobile from existing whatsapp
UPDATE public.profiles
   SET mobile = COALESCE(mobile, whatsapp)
 WHERE whatsapp IS NOT NULL AND mobile IS NULL;

-- Preference check helper (used by edge functions and triggers before sending)
CREATE OR REPLACE FUNCTION public.get_notification_preference(
  _user_id uuid,
  _category text,
  _channel  text  -- 'app' | 'email'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    -- Security notifications are ALWAYS on
    WHEN _category = 'security' THEN true
    ELSE COALESCE(
      (SELECT (notification_preferences -> _category ->> _channel)::boolean
         FROM public.profiles WHERE user_id = _user_id LIMIT 1),
      true
    )
  END;
$$;

-- Active conversations count for the header card
CREATE OR REPLACE FUNCTION public.get_user_active_conversation_count(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::int, 0)
    FROM public.whatsapp_contacts wc
   WHERE wc.assigned_to = _user_id
     AND COALESCE(wc.conversation_status, 'open') NOT IN ('closed','resolved','archived');
$$;

GRANT EXECUTE ON FUNCTION public.get_notification_preference(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_active_conversation_count(uuid) TO authenticated, service_role;