import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AgentTeamConfig = {
  ai_guidance?: string;
  subject_tags?: string[];
  allowed_channels?: string[];
  transfer_mode?: "auto" | "confirm" | "suggest" | "request";
  confirm_question?: string;
  message_before?: string;
  message_waiting?: string;
  message_unavailable?: string;
  fallback_action?: "keep_ai" | "another_team" | "callback" | "task" | "queue" | "hours" | "close";
  fallback_team_id?: string | null;
  priority?: "high" | "medium" | "low";
  availability_source?: "team" | "company" | "24h" | "custom";
  max_wait_minutes?: number;
  distribution_method?: "roundrobin" | "least_load" | "longest_idle" | "current_owner" | "crm_owner" | "manual_priority" | "supervisor";
};

export type AgentTeam = {
  id: string;
  tenant_id: string;
  agent_id: string | null;
  team_id: string;
  position: number;
  is_enabled: boolean;
  config: AgentTeamConfig;
};

export type Team = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string;
  channels: string[];
  member_count: number;
};

export function useAgentTeams() {
  const { profile } = useAuth();
  const tenantId = profile?.company_id ?? null;

  const [teams, setTeams] = useState<Team[]>([]);
  const [agentTeams, setAgentTeams] = useState<AgentTeam[]>([]);
  const [transferEnabled, setTransferEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [{ data: t }, { data: at }, { data: cs }] = await Promise.all([
        supabase.from("chatbot_teams" as any).select("*").eq("tenant_id", tenantId).order("priority"),
        supabase.from("chatbot_agent_teams" as any).select("*").eq("tenant_id", tenantId).is("deleted_at", null).order("position"),
        supabase.from("chatbot_communication_settings" as any).select("transfer_enabled").eq("tenant_id", tenantId).maybeSingle(),
      ]);

      // count members per team
      const teamIds = (t ?? []).map((x: any) => x.id);
      let counts: Record<string, number> = {};
      if (teamIds.length) {
        const { data: mc } = await supabase
          .from("chatbot_team_members" as any)
          .select("team_id")
          .in("team_id", teamIds);
        (mc ?? []).forEach((m: any) => { counts[m.team_id] = (counts[m.team_id] ?? 0) + 1; });
      }

      setTeams(((t ?? []) as any[]).map((x) => ({
        id: x.id, name: x.name, description: x.description,
        status: x.status, color: x.color, channels: x.channels ?? [],
        member_count: counts[x.id] ?? 0,
      })));
      setAgentTeams((at ?? []) as any);
      setTransferEnabled((cs as any)?.transfer_enabled ?? true);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const selectedTeamIds = useMemo(() => new Set(agentTeams.map((a) => a.team_id)), [agentTeams]);

  const setSelectedTeams = useCallback(async (teamIds: string[]) => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const existing = new Map(agentTeams.map((a) => [a.team_id, a]));
      const toKeep = teamIds.filter((id) => existing.has(id));
      const toAdd = teamIds.filter((id) => !existing.has(id));
      const toRemove = agentTeams.filter((a) => !teamIds.includes(a.team_id));

      if (toRemove.length) {
        await supabase.from("chatbot_agent_teams" as any).delete().in("id", toRemove.map((r) => r.id));
      }
      if (toAdd.length) {
        const maxPos = agentTeams.reduce((m, a) => Math.max(m, a.position), -1);
        const rows = toAdd.map((tid, i) => ({
          tenant_id: tenantId, team_id: tid,
          position: maxPos + 1 + i, is_enabled: true, config: {},
        }));
        await supabase.from("chatbot_agent_teams" as any).insert(rows as any);
      }
      await load();
    } finally { setSaving(false); }
  }, [tenantId, agentTeams, load]);

  const reorder = useCallback(async (newIds: string[]) => {
    if (!tenantId) return;
    const updates = newIds.map((id, position) => ({ id, position }));
    setAgentTeams((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      return newIds.map((id, i) => ({ ...(map.get(id) as AgentTeam), position: i }));
    });
    await Promise.all(updates.map((u) =>
      supabase.from("chatbot_agent_teams" as any).update({ position: u.position }).eq("id", u.id)
    ));
  }, [tenantId]);

  const toggleEnabled = useCallback(async (id: string, value: boolean) => {
    setAgentTeams((prev) => prev.map((a) => (a.id === id ? { ...a, is_enabled: value } : a)));
    await supabase.from("chatbot_agent_teams" as any).update({ is_enabled: value }).eq("id", id);
  }, []);

  const remove = useCallback(async (id: string) => {
    setAgentTeams((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("chatbot_agent_teams" as any).delete().eq("id", id);
  }, []);

  const updateConfig = useCallback(async (id: string, config: AgentTeamConfig) => {
    setAgentTeams((prev) => prev.map((a) => (a.id === id ? { ...a, config } : a)));
    await supabase.from("chatbot_agent_teams" as any).update({ config }).eq("id", id);
  }, []);

  const setTransferSwitch = useCallback(async (value: boolean) => {
    if (!tenantId) return;
    setTransferEnabled(value);
    await supabase
      .from("chatbot_communication_settings" as any)
      .upsert({ tenant_id: tenantId, transfer_enabled: value } as any, { onConflict: "tenant_id" });
  }, [tenantId]);

  return {
    teams, agentTeams, transferEnabled, loading, saving,
    selectedTeamIds, setSelectedTeams, reorder, toggleEnabled, remove, updateConfig, setTransferSwitch,
    reload: load,
  };
}
