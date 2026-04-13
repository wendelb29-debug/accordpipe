
-- =============================================
-- ACCORD PERFORMANCE MODULE
-- =============================================

-- 1. TEAMS
CREATE TABLE public.performance_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  gestor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  supervisor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  meta_mensal numeric DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perf_teams_select" ON public.performance_teams
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_teams_insert" ON public.performance_teams
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_teams_update" ON public.performance_teams
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_teams_delete" ON public.performance_teams
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_perf_teams_updated_at
  BEFORE UPDATE ON public.performance_teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. TEAM MEMBERS
CREATE TABLE public.performance_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.performance_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'membro',
  meta_individual numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.performance_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perf_members_select" ON public.performance_team_members
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT id FROM public.performance_teams WHERE tenant_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "perf_members_insert" ON public.performance_team_members
  FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT id FROM public.performance_teams WHERE tenant_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "perf_members_update" ON public.performance_team_members
  FOR UPDATE TO authenticated
  USING (team_id IN (SELECT id FROM public.performance_teams WHERE tenant_id = public.get_user_company_id(auth.uid())));

CREATE POLICY "perf_members_delete" ON public.performance_team_members
  FOR DELETE TO authenticated
  USING (team_id IN (SELECT id FROM public.performance_teams WHERE tenant_id = public.get_user_company_id(auth.uid())));

-- 3. PERFORMANCE GOALS
CREATE TABLE public.performance_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.performance_teams(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL,
  meta_valor numeric NOT NULL DEFAULT 0,
  realizado_valor numeric NOT NULL DEFAULT 0,
  percentual numeric GENERATED ALWAYS AS (CASE WHEN meta_valor > 0 THEN ROUND((realizado_valor / meta_valor) * 100, 2) ELSE 0 END) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perf_goals_select" ON public.performance_goals
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_goals_insert" ON public.performance_goals
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_goals_update" ON public.performance_goals
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_perf_goals_updated_at
  BEFORE UPDATE ON public.performance_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_perf_goals_tenant_period ON public.performance_goals(tenant_id, ano, mes);
CREATE INDEX idx_perf_goals_user ON public.performance_goals(user_id);

-- 4. PERFORMANCE SNAPSHOTS
CREATE TABLE public.performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.performance_teams(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  ganhos integer NOT NULL DEFAULT 0,
  perdas integer NOT NULL DEFAULT 0,
  conversao numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  tarefas_concluidas integer NOT NULL DEFAULT 0,
  sla numeric NOT NULL DEFAULT 0,
  score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perf_snap_select" ON public.performance_snapshots
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_snap_insert" ON public.performance_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE INDEX idx_perf_snap_tenant_date ON public.performance_snapshots(tenant_id, data);
CREATE INDEX idx_perf_snap_user ON public.performance_snapshots(user_id);

-- 5. FEEDBACKS
CREATE TABLE public.performance_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supervisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  pontos_fortes text,
  pontos_melhoria text,
  plano_acao text,
  observacoes text,
  proxima_revisao date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perf_fb_select" ON public.performance_feedbacks
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_fb_insert" ON public.performance_feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_fb_update" ON public.performance_feedbacks
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_perf_fb_updated_at
  BEFORE UPDATE ON public.performance_feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. AI ACTION PLANS
CREATE TABLE public.performance_ai_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gerado_por text NOT NULL DEFAULT 'ia',
  diagnostico text,
  sugestoes text,
  meta_recuperacao text,
  data_reavaliacao date,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_ai_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perf_ai_select" ON public.performance_ai_plans
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_ai_insert" ON public.performance_ai_plans
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_ai_update" ON public.performance_ai_plans
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER update_perf_ai_updated_at
  BEFORE UPDATE ON public.performance_ai_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. HIERARCHY
CREATE TABLE public.performance_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  leader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subordinate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, leader_id, subordinate_id)
);

ALTER TABLE public.performance_hierarchy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perf_hier_select" ON public.performance_hierarchy
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_hier_insert" ON public.performance_hierarchy
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_hier_update" ON public.performance_hierarchy
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "perf_hier_delete" ON public.performance_hierarchy
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_company_id(auth.uid()));
