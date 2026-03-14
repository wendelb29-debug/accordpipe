
-- Table for custom lead capture forms
CREATE TABLE public.crm_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  fields jsonb NOT NULL DEFAULT '["nome","telefone"]'::jsonb,
  tags text[] DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_forms ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view forms for their servidor"
  ON public.crm_forms FOR SELECT TO authenticated
  USING (is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admin/operador can manage forms"
  ON public.crm_forms FOR ALL TO authenticated
  USING (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')) AND servidor_id = get_user_company_id(auth.uid())))
  WITH CHECK (is_master(auth.uid()) OR ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador')) AND servidor_id = get_user_company_id(auth.uid())));

-- Add form_id to crm_leads to track which form generated the lead
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS form_id uuid REFERENCES public.crm_forms(id) ON DELETE SET NULL;

-- Updated_at trigger
CREATE TRIGGER handle_crm_forms_updated_at
  BEFORE UPDATE ON public.crm_forms
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
