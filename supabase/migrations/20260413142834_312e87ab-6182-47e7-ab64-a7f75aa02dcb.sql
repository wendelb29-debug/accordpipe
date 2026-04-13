
-- workspace_kpis: KPIs personalizados por workspace
CREATE TABLE public.workspace_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'quantidade', -- quantidade, valor, percentual, tempo
  origem TEXT NOT NULL DEFAULT 'manual', -- crm, tarefas, financeiro, webhook, manual
  regra JSONB DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  posicao INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_kpis_tenant_select" ON public.workspace_kpis
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "workspace_kpis_tenant_insert" ON public.workspace_kpis
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "workspace_kpis_tenant_update" ON public.workspace_kpis
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "workspace_kpis_tenant_delete" ON public.workspace_kpis
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- workspace_goal_models: Modelo de cálculo por workspace
CREATE TABLE public.workspace_goal_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo_calculo TEXT NOT NULL DEFAULT 'manual', -- manual, auto_crm, auto_tarefas, formula
  regra_calculo JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, tenant_id)
);

ALTER TABLE public.workspace_goal_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_goal_models_tenant_select" ON public.workspace_goal_models
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "workspace_goal_models_tenant_insert" ON public.workspace_goal_models
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "workspace_goal_models_tenant_update" ON public.workspace_goal_models
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "workspace_goal_models_tenant_delete" ON public.workspace_goal_models
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Extend performance_goals with workspace support
ALTER TABLE public.performance_goals
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meta_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resultado_config JSONB DEFAULT '{}';

-- Extend performance_snapshots with workspace support
ALTER TABLE public.performance_snapshots
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kpi_data JSONB DEFAULT '{}';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_kpis_ws ON public.workspace_kpis(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_kpis_tenant ON public.workspace_kpis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_perf_goals_ws ON public.performance_goals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_perf_snapshots_ws ON public.performance_snapshots(workspace_id);
