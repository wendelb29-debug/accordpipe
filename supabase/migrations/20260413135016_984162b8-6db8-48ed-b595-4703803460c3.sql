
-- Function to compute performance data from CRM leads for a given tenant/month/year
CREATE OR REPLACE FUNCTION public.compute_crm_performance(
  _tenant_id uuid,
  _mes integer,
  _ano integer
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  ganhos bigint,
  perdas bigint,
  valor_total numeric,
  conversao numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    l.created_by_user_id as user_id,
    COALESCE(p.name, 'Sem nome') as user_name,
    COUNT(*) FILTER (WHERE l.lead_status = 'ganho') as ganhos,
    COUNT(*) FILTER (WHERE l.lead_status = 'perdido') as perdas,
    COALESCE(SUM(l.value_mrr) FILTER (WHERE l.lead_status = 'ganho'), 0) as valor_total,
    CASE 
      WHEN COUNT(*) FILTER (WHERE l.lead_status IN ('ganho','perdido')) > 0 
      THEN ROUND(
        COUNT(*) FILTER (WHERE l.lead_status = 'ganho')::numeric / 
        COUNT(*) FILTER (WHERE l.lead_status IN ('ganho','perdido'))::numeric * 100
      , 1)
      ELSE 0
    END as conversao
  FROM public.crm_leads l
  LEFT JOIN public.profiles p ON p.user_id = l.created_by_user_id
  WHERE l.servidor_id = _tenant_id
    AND EXTRACT(MONTH FROM l.updated_at) = _mes
    AND EXTRACT(YEAR FROM l.updated_at) = _ano
    AND l.created_by_user_id IS NOT NULL
  GROUP BY l.created_by_user_id, p.name
$$;
