
-- Create CRM tags table
CREATE TABLE public.crm_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  servidor_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name, servidor_id)
);

-- Enable RLS
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view tags for their servidor"
  ON public.crm_tags FOR SELECT TO authenticated
  USING (
    is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid())
  );

CREATE POLICY "Admin/operador can manage tags"
  ON public.crm_tags FOR ALL TO authenticated
  USING (
    is_master(auth.uid()) OR (
      (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'))
      AND servidor_id = get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    is_master(auth.uid()) OR (
      (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'))
      AND servidor_id = get_user_company_id(auth.uid())
    )
  );

-- Add tags column to crm_leads
ALTER TABLE public.crm_leads ADD COLUMN tags text[] DEFAULT '{}';
