import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Playbook {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Script {
  id: string;
  playbook_id: string;
  step_key: string;
  title: string;
  content: string;
  channel: 'whatsapp' | 'call' | 'all';
  sort_order: number;
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
}

export interface CloserSession {
  id: string;
  tenant_id: string;
  user_id: string;
  playbook_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  metadata: any;
  status: 'in_progress' | 'completed' | 'cancelled' | 'converted';
  created_at: string;
}

export function useCloser(playbookId?: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = profile?.company_id;

  const { data: playbooks, isLoading: loadingPlaybooks } = useQuery({
    queryKey: ["closer-playbooks", tenantId],
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

  const { data: scripts, isLoading: loadingScripts } = useQuery({
    queryKey: ["closer-scripts", playbookId, tenantId],
    queryFn: async () => {
      if (!playbookId) return [];
      const { data, error } = await supabase
        .from("closer_scripts")
        .select(`
          *,
          branches:closer_script_branches(*)
        `)
        .eq("playbook_id", playbookId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Script[];
    },
    enabled: !!playbookId,
  });

  const createSession = useMutation({
    mutationFn: async (session: Partial<CloserSession>) => {
      const { data, error } = await supabase
        .from("closer_sessions")
        .insert([{
          ...session,
          tenant_id: profile?.company_id,
          user_id: profile?.id
        }])
        .select()
        .single();
      if (error) throw error;
      return data as CloserSession;
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

  return {
    playbooks,
    scripts,
    isLoading: loadingPlaybooks || loadingScripts,
    createSession,
    logEvent,
    updateSession
  };
}
