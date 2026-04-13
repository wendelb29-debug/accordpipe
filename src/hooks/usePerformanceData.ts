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
  mes: number;
  ano: number;
  meta_valor: number;
  realizado_valor: number;
  percentual: number;
}

export interface PerformanceSnapshot {
  id: string;
  user_id: string | null;
  team_id: string | null;
  data: string;
  ganhos: number;
  perdas: number;
  conversao: number;
  valor_total: number;
  tarefas_concluidas: number;
  sla: number;
  score: number;
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
      const { data: snapsData } = await snapQuery;

      // Fetch users from profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url")
        .eq("company_id", companyId)
        .eq("is_active", true);

      setTeams((teamsData as any[]) || []);
      setGoals((goalsData as any[]) || []);
      setSnapshots((snapsData as any[]) || []);
      setUsers((profilesData as any[]) || []);
    } catch (err) {
      console.error("Error fetching performance data:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, filters.mes, filters.ano, filters.teamId, filters.userId]);

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
