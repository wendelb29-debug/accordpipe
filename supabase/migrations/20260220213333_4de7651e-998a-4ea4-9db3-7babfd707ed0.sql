
-- Public RPC to lookup servidor by CNPJ (safe for unauthenticated users, returns minimal info)
CREATE OR REPLACE FUNCTION public.lookup_servidor_by_cnpj(_cnpj text)
RETURNS TABLE(id uuid, nome_fantasia text, razao_social text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.nome_fantasia, c.razao_social
  FROM public.companies c
  WHERE c.cnpj = _cnpj
    AND c.servidor_id IS NULL
    AND c.status = 'active'
  LIMIT 1;
$$;

-- Update handle_new_user to read company_id from metadata and notify admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_count INTEGER;
  _company_id uuid;
  _admin record;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Read company_id from signup metadata
  _company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;
  
  INSERT INTO public.profiles (user_id, name, email, is_master, is_active, status, company_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    user_count = 0,
    CASE WHEN user_count = 0 THEN true ELSE false END,
    CASE WHEN user_count = 0 THEN 'ativo' ELSE 'pendente' END,
    _company_id
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN user_count = 0 THEN 'admin'::app_role ELSE 'leitura'::app_role END
  );

  -- Notify admins of the servidor about the new pending user
  IF user_count > 0 AND _company_id IS NOT NULL THEN
    FOR _admin IN
      SELECT p.user_id
      FROM public.profiles p
      INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE p.company_id = _company_id
        AND ur.role = 'admin'
        AND p.is_active = true
        AND p.user_id != NEW.id
    LOOP
      PERFORM public.create_notification(
        _admin.user_id,
        'Novo usuário pendente',
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email) || ' solicitou acesso ao servidor.',
        'user_pending'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;
