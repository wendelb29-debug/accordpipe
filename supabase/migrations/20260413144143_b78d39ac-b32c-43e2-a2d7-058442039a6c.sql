
-- Workspace-level goals
CREATE TABLE public.workspace_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL CHECK (ano BETWEEN 2020 AND 2100),
  meta_valor NUMERIC NOT NULL DEFAULT 0,
  tipo_meta TEXT NOT NULL DEFAULT 'valor' CHECK (tipo_meta IN ('quantidade', 'valor', 'percentual')),
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, workspace_id, mes, ano)
);

ALTER TABLE public.workspace_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace goals of their tenant"
  ON public.workspace_goals FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can insert workspace goals"
  ON public.workspace_goals FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update workspace goals"
  ON public.workspace_goals FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete workspace goals"
  ON public.workspace_goals FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_workspace_goals_updated_at
  BEFORE UPDATE ON public.workspace_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- User-level goals
CREATE TABLE public.user_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL CHECK (ano BETWEEN 2020 AND 2100),
  meta_valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, workspace_id, user_id, mes, ano)
);

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view user goals of their tenant"
  ON public.user_goals FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can insert user goals"
  ON public.user_goals FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update user goals"
  ON public.user_goals FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can delete user goals"
  ON public.user_goals FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
