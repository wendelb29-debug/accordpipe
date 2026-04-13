import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export interface PerformanceTeam {
  id: string;
  nome: string;
  gestor_id: string | null;
  supervisor_id: string | null;
  workspace_id: string | null;
  meta_mensal: number;
  ativo: boolean;
}

export interface PerformanceGoal {
  id: string;
  user_id: string | null;
  team_id: string | null;
  workspace_id: string | null;
  mes: number;
  ano: number;
  meta_valor: number;
  realizado_valor: number;
  percentual: number;
  meta_config?: Record<string, any>;
  resultado_config?: Record<string, any>;
}

export interface PerformanceSnapshot {
  id: string;
  user_id: string | null;
  team_id: string | null;
  workspace_id: string | null;
  data: string;
  ganhos: number;
  perdas: number;
  conversao: number;
  valor_total: number;
  tarefas_concluidas: number;
  sla: number;
  score: number;
  kpi_data?: Record<string, any>;
}

export interface FeedbackChecklistItem {
  id: string;
  text: string;
  done: boolean;
  done_at?: string;
}

export interface FeedbackCheckinEntry {
  status: string;
  message?: string;
  created_at: string;
}

export interface FeedbackCommentEntry {
  text: string;
  created_at: string;
  type?: string;
}

export interface PerformanceFeedback {
  id: string;
  supervisor_id: string;
  user_id: string;
  data: string;
  pontos_fortes: string | null;
  pontos_melhoria: string | null;
  plano_acao: string | null;
  observacoes: string | null;
  proxima_revisao: string | null;
  status: string;
  visualizado: boolean;
  visualizado_em: string | null;
  comentario_usuario: string | null;
  supervisor_name: string | null;
  confirmed_at: string | null;
  assumed_at: string | null;
  checklist: FeedbackChecklistItem[];
  checkin_history: FeedbackCheckinEntry[];
  comment_history: FeedbackCommentEntry[];
  created_at?: string;
  updated_at?: string;
}

export interface AIActionPlan {
  id: string;
  user_id: string;
  gerado_por: string;
  diagnostico: string | null;
  sugestoes: string | null;
  meta_recuperacao: string | null;
  data_reavaliacao: string | null;
  status: string;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface WorkspaceKPI {
  id: string;
  workspace_id: string;
  tenant_id: string;
  nome: string;
  tipo: string; // quantidade, valor, percentual, tempo
  origem: string; // crm, tarefas, financeiro, webhook, manual
  regra: Record<string, any>;
  ativo: boolean;
  posicao: number;
}

export interface WorkspaceGoalModel {
  id: string;
  workspace_id: string;
  tenant_id: string;
  tipo_calculo: string; // manual, auto_crm, auto_tarefas, formula
  regra_calculo: Record<string, any>;
}

export function usePerformanceData(filters: {
  mes: number;
  ano: number;
  teamId?: string;
  userId?: string;
  workspaceId?: string;
}) {
  const companyId = useActiveCompanyId();
  const [teams, setTeams] = useState<PerformanceTeam[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [snapshots, setSnapshots] = useState<PerformanceSnapshot[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [workspaceKpis, setWorkspaceKpis] = useState<WorkspaceKPI[]>([]);
  const [goalModel, setGoalModel] = useState<WorkspaceGoalModel | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch teams
      const { data: teamsData } = await supabase
        .from("performance_teams")
        .select("*")
        .eq("tenant_id", companyId)
        .eq("ativo", true);

      // Fetch goals for the period
      let goalsQuery = supabase
        .from("performance_goals")
        .select("*")
        .eq("tenant_id", companyId)
        .eq("mes", filters.mes)
        .eq("ano", filters.ano);
      if (filters.teamId) goalsQuery = goalsQuery.eq("team_id", filters.teamId);
      if (filters.userId) goalsQuery = goalsQuery.eq("user_id", filters.userId);
      if (filters.workspaceId) goalsQuery = goalsQuery.eq("workspace_id", filters.workspaceId);
      const { data: goalsData } = await goalsQuery;

      // Fetch snapshots for the month
      const startDate = `${filters.ano}-${String(filters.mes).padStart(2, "0")}-01`;
      const endDate = filters.mes === 12
        ? `${filters.ano + 1}-01-01`
        : `${filters.ano}-${String(filters.mes + 1).padStart(2, "0")}-01`;

      let snapQuery = supabase
        .from("performance_snapshots")
        .select("*")
        .eq("tenant_id", companyId)
        .gte("data", startDate)
        .lt("data", endDate)
        .order("data");
      if (filters.userId) snapQuery = snapQuery.eq("user_id", filters.userId);
      if (filters.teamId) snapQuery = snapQuery.eq("team_id", filters.teamId);
      if (filters.workspaceId) snapQuery = snapQuery.eq("workspace_id", filters.workspaceId);
      const { data: snapsData } = await snapQuery;

      // Fetch users from profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url")
        .eq("company_id", companyId)
        .eq("is_active", true);

      // Fetch workspace KPIs if a workspace is selected
      let wsKpis: WorkspaceKPI[] = [];
      let wsGoalModel: WorkspaceGoalModel | null = null;
      if (filters.workspaceId) {
        const { data: kpisData } = await supabase
          .from("workspace_kpis")
          .select("*")
          .eq("workspace_id", filters.workspaceId)
          .eq("tenant_id", companyId)
          .eq("ativo", true)
          .order("posicao");
        wsKpis = (kpisData as any[]) || [];

        const { data: modelData } = await supabase
          .from("workspace_goal_models")
          .select("*")
          .eq("workspace_id", filters.workspaceId)
          .eq("tenant_id", companyId)
          .maybeSingle();
        wsGoalModel = modelData as any;
      }

      // If no manual goals exist, compute from CRM leads automatically
      let finalGoals = (goalsData as any[]) || [];
      let finalSnapshots = (snapsData as any[]) || [];

      if (finalGoals.length === 0 || finalSnapshots.length === 0) {
        const { data: crmPerf } = await supabase.rpc("compute_crm_performance", {
          _tenant_id: companyId,
          _mes: filters.mes,
          _ano: filters.ano,
        });

        if (crmPerf && crmPerf.length > 0) {
          if (finalGoals.length === 0) {
            finalGoals = (crmPerf as any[]).map((row: any) => ({
              id: `crm-${row.user_id}`,
              user_id: row.user_id,
              team_id: null,
              workspace_id: filters.workspaceId || null,
              mes: filters.mes,
              ano: filters.ano,
              meta_valor: 0,
              realizado_valor: Number(row.valor_total) || 0,
              percentual: 0,
            }));
          }

          if (finalSnapshots.length === 0) {
            finalSnapshots = (crmPerf as any[]).map((row: any) => ({
              id: `crm-snap-${row.user_id}`,
              user_id: row.user_id,
              team_id: null,
              workspace_id: filters.workspaceId || null,
              data: startDate,
              ganhos: Number(row.ganhos) || 0,
              perdas: Number(row.perdas) || 0,
              conversao: Number(row.conversao) || 0,
              valor_total: Number(row.valor_total) || 0,
              tarefas_concluidas: 0,
              sla: 0,
              score: Number(row.conversao) || 0,
            }));
          }
        }
      }

      setTeams((teamsData as any[]) || []);
      setGoals(finalGoals);
      setSnapshots(finalSnapshots);
      setUsers((profilesData as any[]) || []);
      setWorkspaceKpis(wsKpis);
      setGoalModel(wsGoalModel);
    } catch (err) {
      console.error("Error fetching performance data:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, filters.mes, filters.ano, filters.teamId, filters.userId, filters.workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute KPIs
  const totalMeta = goals.reduce((sum, g) => sum + (g.meta_valor || 0), 0);
  const totalRealizado = goals.reduce((sum, g) => sum + (g.realizado_valor || 0), 0);
  const percentualGeral = totalMeta > 0 ? Math.round((totalRealizado / totalMeta) * 100) : 0;
  const totalGanhos = snapshots.reduce((sum, s) => sum + s.ganhos, 0);
  const totalPerdas = snapshots.reduce((sum, s) => sum + s.perdas, 0);
  const conversaoMedia = (totalGanhos + totalPerdas) > 0
    ? Math.round((totalGanhos / (totalGanhos + totalPerdas)) * 100)
    : 0;

  return {
    teams,
    goals,
    snapshots,
    users,
    workspaceKpis,
    goalModel,
    loading,
    refetch: fetchData,
    kpis: {
      totalMeta,
      totalRealizado,
      percentualGeral,
      totalGanhos,
      totalPerdas,
      conversaoMedia,
    },
  };
}

export function usePerformanceFeedbacks(userId?: string) {
  const companyId = useActiveCompanyId();
  const [feedbacks, setFeedbacks] = useState<PerformanceFeedback[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    if (!companyId || !userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("performance_feedbacks")
      .select("*")
      .eq("tenant_id", companyId)
      .eq("user_id", userId)
      .order("data", { ascending: false });
    setFeedbacks((data as any[]) || []);
    setLoading(false);
  }, [companyId, userId]);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);
  return { feedbacks, loading, refetch: fetchFeedbacks };
}

export function useAIActionPlans(userId?: string) {
  const companyId = useActiveCompanyId();
  const [plans, setPlans] = useState<AIActionPlan[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!companyId || !userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("performance_ai_plans")
      .select("*")
      .eq("tenant_id", companyId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setPlans((data as any[]) || []);
    setLoading(false);
  }, [companyId, userId]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  return { plans, loading, refetch: fetchPlans };
}
