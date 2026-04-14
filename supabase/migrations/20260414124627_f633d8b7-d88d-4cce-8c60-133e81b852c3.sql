-- Add workspace_id to crm_forms
ALTER TABLE public.crm_forms
ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_crm_forms_workspace_id ON public.crm_forms(workspace_id);