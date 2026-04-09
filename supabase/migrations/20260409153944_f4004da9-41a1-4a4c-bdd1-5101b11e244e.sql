
-- Create workspace_groups table
CREATE TABLE public.workspace_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  type text NOT NULL DEFAULT 'custom',
  icon text NOT NULL DEFAULT 'folder',
  color text NOT NULL DEFAULT '#7C3AED',
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view workspace groups of their company"
  ON public.workspace_groups FOR SELECT TO authenticated
  USING (servidor_id = get_user_company_id(auth.uid()) OR is_master(auth.uid()));

CREATE POLICY "Admin can manage workspace groups"
  ON public.workspace_groups FOR ALL TO authenticated
  USING (
    is_master(auth.uid()) OR (
      (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
      AND servidor_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    is_master(auth.uid()) OR (
      (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
      AND servidor_id = get_user_company_id(auth.uid())
    )
  );

-- Add group_id and sort_order to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.workspace_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
