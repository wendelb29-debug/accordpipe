import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "sonner";

export interface WorkspaceGoal {
  id: string;
  tenant_id: string;
  workspace_id: string;
  mes: number;
  ano: number;
  meta_valor: number;
  tipo_meta: string;
  criado_por: string | null;
}

export interface UserGoal {
  id: string;
  tenant_id: string;
  workspace_id: string;
  user_id: string;
  mes: number;
  ano: number;
  meta_valor: number;
}

export function useGoalManagement(workspaceId: string | undefined, mes: number, ano: number) {
  const companyId = useActiveCompanyId();
  const [workspaceGoal, setWorkspaceGoal] = useState<WorkspaceGoal | null>(null);
  const [userGoals, setUserGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!companyId || !workspaceId) {
      setWorkspaceGoal(null);
      setUserGoals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [wsRes, ugRes] = await Promise.all([
        supabase
          .from("workspace_goals")
          .select("*")
          .eq("tenant_id", companyId)
          .eq("workspace_id", workspaceId)
          .eq("mes", mes)
          .eq("ano", ano)
          .maybeSingle(),
        supabase
          .from("user_goals")
          .select("*")
          .eq("tenant_id", companyId)
          .eq("workspace_id", workspaceId)
          .eq("mes", mes)
          .eq("ano", ano),
      ]);
      setWorkspaceGoal((wsRes.data as any) || null);
      setUserGoals((ugRes.data as any[]) || []);
    } catch (err) {
      console.error("Error fetching goals:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, workspaceId, mes, ano]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const upsertWorkspaceGoal = async (metaValor: number, tipoMeta: string = "valor") => {
    if (!companyId || !workspaceId) return;
    const { data: user } = await supabase.auth.getUser();
    const payload = {
      tenant_id: companyId,
      workspace_id: workspaceId,
      mes, ano,
      meta_valor: metaValor,
      tipo_meta: tipoMeta,
      criado_por: user?.user?.id || null,
    };

    if (workspaceGoal) {
      const { error } = await supabase
        .from("workspace_goals")
        .update({ meta_valor: metaValor, tipo_meta: tipoMeta })
        .eq("id", workspaceGoal.id);
      if (error) { toast.error("Erro ao atualizar meta"); throw error; }
    } else {
      const { error } = await supabase.from("workspace_goals").insert(payload as any);
      if (error) { toast.error("Erro ao criar meta"); throw error; }
    }
    toast.success("Meta do workspace salva");
    await fetchGoals();
  };

  const upsertUserGoal = async (userId: string, metaValor: number) => {
    if (!companyId || !workspaceId) return;
    const existing = userGoals.find(g => g.user_id === userId);
    if (existing) {
      const { error } = await supabase
        .from("user_goals")
        .update({ meta_valor: metaValor })
        .eq("id", existing.id);
      if (error) { toast.error("Erro ao atualizar meta"); throw error; }
    } else {
      const { error } = await supabase.from("user_goals").insert({
        tenant_id: companyId,
        workspace_id: workspaceId,
        user_id: userId,
        mes, ano,
        meta_valor: metaValor,
      } as any);
      if (error) { toast.error("Erro ao criar meta individual"); throw error; }
    }
    await fetchGoals();
  };

  const distributeGoals = async (
    userIds: string[],
    mode: "equal" | "manual",
    manualValues?: Record<string, number>
  ) => {
    if (!companyId || !workspaceId || !workspaceGoal) return;
    const total = workspaceGoal.meta_valor;

    for (const uid of userIds) {
      const val = mode === "equal" ? Math.round((total / userIds.length) * 100) / 100 : (manualValues?.[uid] ?? 0);
      await upsertUserGoal(uid, val);
    }
    toast.success("Metas distribuídas com sucesso");
    await fetchGoals();
  };

  return {
    workspaceGoal,
    userGoals,
    loading,
    upsertWorkspaceGoal,
    upsertUserGoal,
    distributeGoals,
    refetch: fetchGoals,
  };
}
