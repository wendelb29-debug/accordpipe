import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "./useActiveCompanyId";
import { toast } from "@/hooks/use-toast";

export type ChatbotTeam = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  department_id: string | null;
  status: "active" | "inactive" | "draft";
  priority: number;
  schedule: Record<string, any>;
  timezone: string;
  channels: string[];
  attend_holidays: boolean;
  max_concurrent_per_agent: number;
  max_wait_seconds: number;
  offhours_message: string | null;
  fallback_team_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatbotTeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: "owner" | "supervisor" | "agent";
};

export type ChatbotTeamRule = {
  id: string;
  team_id: string;
  tenant_id: string;
  ai_description: string | null;
  subjects: string[];
  keywords: string[];
  intents: string[];
  tags: string[];
  allowed_channels: string[];
  transfer_mode: "auto" | "confirm";
  message_before: string | null;
  message_after: string | null;
  unavailable_action: string;
  fallback_team_id: string | null;
};

export type ChatbotTeamWithRelations = ChatbotTeam & {
  members: ChatbotTeamMember[];
  rules: ChatbotTeamRule | null;
};

export function useChatbotTeams() {
  const tenantId = useActiveCompanyId();
  const qc = useQueryClient();

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["chatbot_teams", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<ChatbotTeamWithRelations[]> => {
      const { data: teamsData, error } = await (supabase as any)
        .from("chatbot_teams")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("priority", { ascending: true });
      if (error) throw error;
      const ids = (teamsData ?? []).map((t: any) => t.id);
      if (!ids.length) return [];

      const [{ data: members }, { data: rules }] = await Promise.all([
        (supabase as any).from("chatbot_team_members").select("*").in("team_id", ids),
        (supabase as any).from("chatbot_team_rules").select("*").in("team_id", ids),
      ]);

      return (teamsData ?? []).map((t: any) => ({
        ...t,
        members: (members ?? []).filter((m: any) => m.team_id === t.id),
        rules: (rules ?? []).find((r: any) => r.team_id === t.id) ?? null,
      }));
    },
  });

  const upsertTeam = useMutation({
    mutationFn: async (payload: {
      team: Partial<ChatbotTeam> & { name: string };
      members: { user_id: string; role: ChatbotTeamMember["role"] }[];
      rules: Partial<ChatbotTeamRule>;
      id?: string;
    }) => {
      if (!tenantId) throw new Error("Sem tenant ativo");
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;

      let teamId = payload.id;
      const teamRow = {
        ...payload.team,
        tenant_id: tenantId,
        updated_by: uid,
      };

      if (teamId) {
        const { error } = await (supabase as any)
          .from("chatbot_teams")
          .update(teamRow)
          .eq("id", teamId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("chatbot_teams")
          .insert({ ...teamRow, created_by: uid })
          .select("id")
          .single();
        if (error) throw error;
        teamId = data.id;
      }

      // Replace members
      await (supabase as any).from("chatbot_team_members").delete().eq("team_id", teamId);
      if (payload.members.length) {
        const { error: mErr } = await (supabase as any).from("chatbot_team_members").insert(
          payload.members.map((m) => ({ ...m, team_id: teamId, tenant_id: tenantId })),
        );
        if (mErr) throw mErr;
      }

      // Upsert rules (one row per team)
      const ruleRow = {
        ...payload.rules,
        team_id: teamId,
        tenant_id: tenantId,
      };
      const { error: rErr } = await (supabase as any)
        .from("chatbot_team_rules")
        .upsert(ruleRow, { onConflict: "team_id" });
      if (rErr) throw rErr;

      return teamId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatbot_teams", tenantId] });
      toast({ title: "Equipe salva com sucesso" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao salvar equipe", description: e.message, variant: "destructive" });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ChatbotTeam["status"] }) => {
      const { error } = await (supabase as any)
        .from("chatbot_teams")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot_teams", tenantId] }),
  });

  const duplicateTeam = useMutation({
    mutationFn: async (team: ChatbotTeamWithRelations) => {
      if (!tenantId) throw new Error("Sem tenant ativo");
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      const { id, created_at, updated_at, members, rules, ...rest } = team;
      const { data: newTeam, error } = await (supabase as any)
        .from("chatbot_teams")
        .insert({
          ...rest,
          name: `${team.name} (cópia)`,
          created_by: uid,
          updated_by: uid,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (members.length) {
        await (supabase as any).from("chatbot_team_members").insert(
          members.map((m) => ({
            team_id: newTeam.id,
            tenant_id: tenantId,
            user_id: m.user_id,
            role: m.role,
          })),
        );
      }
      if (rules) {
        const { id: _rid, team_id: _tid, ...rrest } = rules;
        await (supabase as any).from("chatbot_team_rules").insert({
          ...rrest,
          team_id: newTeam.id,
          tenant_id: tenantId,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatbot_teams", tenantId] });
      toast({ title: "Equipe duplicada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao duplicar", description: e.message, variant: "destructive" }),
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("chatbot_teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatbot_teams", tenantId] });
      toast({ title: "Equipe excluída" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  const reorder = useMutation({
    mutationFn: async (ordered: { id: string; priority: number }[]) => {
      await Promise.all(
        ordered.map((o) =>
          (supabase as any).from("chatbot_teams").update({ priority: o.priority }).eq("id", o.id),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot_teams", tenantId] }),
  });

  return { teams, isLoading, upsertTeam, toggleStatus, duplicateTeam, deleteTeam, reorder };
}

export function useTenantUsers() {
  const tenantId = useActiveCompanyId();
  return useQuery({
    queryKey: ["tenant-users-for-chatbot", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data: userTenants } = await (supabase as any)
        .from("user_tenants")
        .select("user_id")
        .eq("tenant_id", tenantId);
      const ids = (userTenants ?? []).map((u: any) => u.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", ids);
      return profiles ?? [];
    },
  });
}

export function useTenantDepartments() {
  const tenantId = useActiveCompanyId();
  return useQuery({
    queryKey: ["tenant-departments-list", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_departments")
        .select("id, name, color, icon")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
  });
}
