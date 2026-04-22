-- 1) Garante que o workspace 'pre' tenha ao menos uma coluna inicial no Kanban
INSERT INTO public.kanban_columns (workspace_id, name, position, color)
SELECT 'e310f236-bda8-47f0-a853-f693c30a409d', 'Novos', 0, '#3B82F6'
WHERE NOT EXISTS (
  SELECT 1 FROM public.kanban_columns
  WHERE workspace_id = 'e310f236-bda8-47f0-a853-f693c30a409d'
);

-- 2) Move todos os leads do tenant que não têm workspace para o workspace 'pre'
--    e coloca no estágio inicial (id da primeira coluna recém criada)
UPDATE public.crm_leads
SET 
  workspace_id = 'e310f236-bda8-47f0-a853-f693c30a409d',
  stage = (
    SELECT id::text FROM public.kanban_columns
    WHERE workspace_id = 'e310f236-bda8-47f0-a853-f693c30a409d'
    ORDER BY position ASC LIMIT 1
  ),
  stage_entered_at = now(),
  updated_at = now()
WHERE servidor_id = '899e7258-0083-4169-ac9b-a2be5a632d97'
  AND workspace_id IS NULL;