import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface Playbook {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  tenant_id: string | null;
}

export interface Script {
  id: string;
  playbook_id: string;
  step_key: string;
  title: string;
  content: string;
  channel: 'whatsapp' | 'call' | 'all';
  sort_order: number;
  is_active: boolean;
  branches?: ScriptBranch[];
}

export interface ScriptBranch {
  id: string;
  script_id: string;
  branch_key: string;
  label: string;
  next_step_key: string | null;
  branch_content: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CloserSession {
  id: string;
  tenant_id: string;
  workspace_id: string;
  user_id: string;
  playbook_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  metadata: any;
  status: 'in_progress' | 'completed' | 'cancelled' | 'converted';
  created_at: string;
}

export interface WorkspaceCloserSettings {
  id: string;
  tenant_id: string;
  workspace_id: string;
  closer_enabled: boolean;
  playbook_id: string | null;
  default_send_message_script_id: string | null;
  default_whatsapp_script_id: string | null;
  updated_at: string;
}

export function useCloser(playbookId?: string) {
  const { profile, user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const tenantId = profile?.company_id;

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["workspace-closer-settings", tenantId, activeWorkspaceId],
    queryFn: async () => {
      if (!tenantId || !activeWorkspaceId) return null;
      const { data, error } = await supabase
        .from("workspace_closer_settings")
        .select("*")
        .eq("workspace_id", activeWorkspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as WorkspaceCloserSettings;
    },
    enabled: !!tenantId && !!activeWorkspaceId,
  });

  const { data: playbooks, isLoading: loadingPlaybooks } = useQuery({
    queryKey: ["closer-playbooks", tenantId, activeWorkspaceId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("closer_playbooks")
        .select("*")
        .eq("is_active", true)
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .order("name");
      if (error) throw error;
      return data as Playbook[];
    },
    enabled: !!tenantId,
  });

  const effectivePlaybookId = playbookId || settings?.playbook_id;

  const { data: scripts, isLoading: loadingScripts } = useQuery({
    queryKey: ["closer-scripts", tenantId, activeWorkspaceId, effectivePlaybookId],
    queryFn: async () => {
      if (!effectivePlaybookId) return [];
      const { data, error } = await supabase
        .from("closer_scripts")
        .select(`
          *,
          branches:closer_script_branches(*)
        `)
        .eq("playbook_id", effectivePlaybookId)
        .eq("is_active", true);
      
      if (error) throw error;
      
      const sortedScripts = [...(data || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(s => ({
        ...s,
        branches: [...(s.branches || [])]
          .filter(b => b.is_active !== false)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      }));
      
      return sortedScripts as any as Script[];
    },
    enabled: !!effectivePlaybookId,
  });

  const createSession = useMutation({
    mutationFn: async (sessionData: Partial<CloserSession>) => {
      const { data, error } = await supabase
        .from("closer_sessions")
        .insert([{
          ...sessionData,
          tenant_id: tenantId,
          workspace_id: activeWorkspaceId,
          user_id: user?.id
        }])
        .select()
        .single();
      if (error) throw error;
      return (data as any) as CloserSession;
    }
  });

  const logEvent = useMutation({
    mutationFn: async (event: {
      session_id: string;
      event_type: string;
      step_key?: string;
      branch_key?: string;
      content?: string;
    }) => {
      const { error } = await supabase
        .from("closer_session_events")
        .insert([event]);
      if (error) throw error;
    }
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CloserSession> & { id: string }) => {
      const { error } = await supabase
        .from("closer_sessions")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<WorkspaceCloserSettings>) => {
      if (!tenantId || !activeWorkspaceId) throw new Error("Missing context");
      const { data, error } = await supabase
        .from("workspace_closer_settings")
        .upsert({
          ...updates,
          tenant_id: tenantId,
          workspace_id: activeWorkspaceId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-closer-settings", tenantId, activeWorkspaceId] });
      toast.success("Configurações atualizadas!");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao atualizar configurações");
    }
  });

  return {
    settings,
    playbooks,
    scripts,
    isLoading: loadingSettings || loadingPlaybooks || loadingScripts,
    createSession,
    logEvent,
    updateSession,
    updateSettings
  };
}
