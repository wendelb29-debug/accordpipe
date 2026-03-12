
-- Fix check_cnpj_status to strip non-digits from both the input and stored CNPJ
CREATE OR REPLACE FUNCTION public.check_cnpj_status(_cnpj text)
RETURNS TABLE(result_status text, id uuid, nome_fantasia text, razao_social text, company_status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN c.servidor_id IS NULL THEN 'servidor'
      ELSE 'ja_cadastrado'
    END as result_status,
    c.id,
    c.nome_fantasia,
    c.razao_social,
    c.status as company_status
  FROM public.companies c
  WHERE regexp_replace(c.cnpj, '\D', '', 'g') = regexp_replace(_cnpj, '\D', '', 'g')
  LIMIT 1;
$$;

-- Also fix the original lookup_servidor_by_cnpj function for consistency
CREATE OR REPLACE FUNCTION public.lookup_servidor_by_cnpj(_cnpj text)
RETURNS TABLE(id uuid, nome_fantasia text, razao_social text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.nome_fantasia, c.razao_social, c.status
  FROM public.companies c
  WHERE regexp_replace(c.cnpj, '\D', '', 'g') = regexp_replace(_cnpj, '\D', '', 'g')
    AND c.servidor_id IS NULL
    AND c.status IN ('active', 'teste')
  LIMIT 1;
$$;
