
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;

CREATE OR REPLACE FUNCTION public.get_today_birthdays(_company_id uuid DEFAULT NULL)
RETURNS TABLE(user_id uuid, name text, avatar_url text, birth_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.user_id, p.name, p.avatar_url, p.birth_date
  FROM public.profiles p
  WHERE p.birth_date IS NOT NULL
    AND EXTRACT(MONTH FROM p.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM p.birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
    AND p.is_active = true
    AND (_company_id IS NULL OR p.company_id = _company_id)
  ORDER BY p.name;
$$;
