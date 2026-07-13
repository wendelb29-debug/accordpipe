
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS origin_workspace_id uuid NULL,
  ADD COLUMN IF NOT EXISTS origin_stage text NULL;

-- Backfill: for leads won and already sitting in a 'cadastro' workspace with no origin recorded,
-- assume the origin is the tenant's default sales workspace (or the oldest non-cadastro one).
WITH candidates AS (
  SELECT l.id AS lead_id,
         (
           SELECT w.id
           FROM public.workspaces w
           WHERE w.servidor_id = l.servidor_id
             AND (w.type IS DISTINCT FROM 'cadastro')
           ORDER BY (w.is_default IS TRUE) DESC, w.created_at ASC
           LIMIT 1
         ) AS origin_ws
  FROM public.crm_leads l
  JOIN public.workspaces cw ON cw.id = l.workspace_id
  WHERE l.lead_status = 'won'
    AND l.origin_workspace_id IS NULL
    AND cw.type = 'cadastro'
)
UPDATE public.crm_leads l
SET origin_workspace_id = c.origin_ws
FROM candidates c
WHERE l.id = c.lead_id
  AND c.origin_ws IS NOT NULL;
