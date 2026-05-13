UPDATE public.profiles
SET is_active = true, status = 'ativo', updated_at = now()
WHERE email = 'nicolly.csilverio@gmail.com';