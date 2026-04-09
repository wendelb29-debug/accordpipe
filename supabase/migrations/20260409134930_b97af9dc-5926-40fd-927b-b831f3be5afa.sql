
-- Create card_history table for tracking column transitions
CREATE TABLE public.card_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_column_id uuid REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  to_column_id uuid REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  moved_by_user_id uuid,
  moved_by_name text,
  moved_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.card_history ENABLE ROW LEVEL SECURITY;

-- RLS: users can view history for their company workspaces
CREATE POLICY "Users can view card history of their company"
ON public.card_history
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT w.id FROM public.workspaces w
    WHERE w.servidor_id = get_user_company_id(auth.uid())
  )
  OR is_master(auth.uid())
);

-- RLS: users can insert card history for their company workspaces
CREATE POLICY "Users can insert card history"
ON public.card_history
FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT w.id FROM public.workspaces w
    WHERE w.servidor_id = get_user_company_id(auth.uid())
  )
  OR is_master(auth.uid())
);

-- Index for fast lookups
CREATE INDEX idx_card_history_lead_id ON public.card_history(lead_id);
CREATE INDEX idx_card_history_workspace_id ON public.card_history(workspace_id);
