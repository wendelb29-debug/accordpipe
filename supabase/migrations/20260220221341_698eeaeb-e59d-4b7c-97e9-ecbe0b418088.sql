
-- Create a new function to check CNPJ status with two-stage verification
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
  WHERE c.cnpj = _cnpj
  LIMIT 1;
$$;
