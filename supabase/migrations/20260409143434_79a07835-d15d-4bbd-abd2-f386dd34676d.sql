
-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage kanban columns of their company workspaces" ON public.kanban_columns;
DROP POLICY IF EXISTS "Users can view kanban columns of their company workspaces" ON public.kanban_columns;

-- Recreate with master support
CREATE POLICY "Users can view kanban columns"
ON public.kanban_columns
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT w.id FROM public.workspaces w
    WHERE w.servidor_id = get_user_company_id(auth.uid())
  )
  OR is_master(auth.uid())
);

CREATE POLICY "Users can manage kanban columns"
ON public.kanban_columns
FOR ALL
TO authenticated
USING (
  workspace_id IN (
    SELECT w.id FROM public.workspaces w
    WHERE w.servidor_id = get_user_company_id(auth.uid())
  )
  OR is_master(auth.uid())
)
WITH CHECK (
  workspace_id IN (
    SELECT w.id FROM public.workspaces w
    WHERE w.servidor_id = get_user_company_id(auth.uid())
  )
  OR is_master(auth.uid())
);
