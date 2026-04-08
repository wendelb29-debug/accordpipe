CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_count INTEGER;
  _company_id uuid;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  _company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;
  
  INSERT INTO public.profiles (user_id, name, email, is_master, is_active, status, company_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    user_count = 0,
    true,
    'ativo',
    _company_id
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN user_count = 0 THEN 'admin'::app_role ELSE 'leitura'::app_role END
  );

  RETURN NEW;
END;
$function$;