
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS is_trial_user BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_trial_expires_at
  ON public.profiles(trial_expires_at)
  WHERE trial_expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_user_trial_expired(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND trial_expires_at IS NOT NULL
      AND trial_expires_at <= now()
  );
$$;
