
CREATE TABLE public.kanban_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  sla_days INTEGER NOT NULL DEFAULT 7,
  color TEXT NOT NULL DEFAULT '#6366F1',
  icon TEXT NOT NULL DEFAULT 'circle',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kanban columns of their company workspaces"
ON public.kanban_columns
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT w.id FROM public.workspaces w
    WHERE w.servidor_id = public.get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Users can manage kanban columns of their company workspaces"
ON public.kanban_columns
FOR ALL
TO authenticated
USING (
  workspace_id IN (
    SELECT w.id FROM public.workspaces w
    WHERE w.servidor_id = public.get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT w.id FROM public.workspaces w
    WHERE w.servidor_id = public.get_user_company_id(auth.uid())
  )
);

CREATE TRIGGER update_kanban_columns_updated_at
BEFORE UPDATE ON public.kanban_columns
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_kanban_columns_workspace ON public.kanban_columns(workspace_id);
