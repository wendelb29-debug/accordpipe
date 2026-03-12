
DROP FUNCTION IF EXISTS public.lookup_servidor_by_cnpj(text);

CREATE OR REPLACE FUNCTION public.lookup_servidor_by_cnpj(_cnpj text)
RETURNS TABLE(id uuid, nome_fantasia text, razao_social text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.nome_fantasia, c.razao_social, c.status
  FROM public.companies c
  WHERE c.cnpj = _cnpj
    AND c.servidor_id IS NULL
    AND c.status IN ('active', 'teste')
  LIMIT 1;
$$;
