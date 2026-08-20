import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";

export type TeamStatus = 'active' | 'inactive' | 'archived';
export type MemberRole = 'responsible' | 'supervisor' | 'agent' | 'observer';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  team_type: string;
  status: TeamStatus;
  distribution_method: string;
  max_concurrent_conversations: number;
  queue_timeout_minutes: number;
  fallback_action: string;
  fallback_team_id: string | null;
  use_business_hours: boolean;
  schedule_mode: string;
  tenant_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  member_role: MemberRole;
  priority: number;
  max_concurrent: number | null;
  member_status: 'active' | 'inactive';
  joined_at: string;
  profile?: {
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

export function useTeams() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_agent_teams")
        .select(`
          *,
          members:chatbot_team_members(
            *,
            profile:profiles(name, email, avatar_url)
          )
        `)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("teams-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chatbot_agent_teams" },
        () => queryClient.invalidateQueries({ queryKey: ["teams"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chatbot_team_members" },
        () => queryClient.invalidateQueries({ queryKey: ["teams"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createTeam = useMutation({
    mutationFn: async (newTeam: Partial<Team> & { members?: Partial<TeamMember>[] }) => {
      const { members, ...teamData } = newTeam;
      
      // 1. Get company_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();
      
      if (!profile) throw new Error("Profile not found");

      // 2. Create team
      const { data: team, error: teamError } = await supabase
        .from("chatbot_agent_teams")
        .insert([{ ...teamData, tenant_id: profile.company_id }])
        .select()
        .single();

      if (teamError) throw teamError;

      // 3. Add members if provided
      if (members && members.length > 0) {
        const membersToInsert = members.map(m => ({
          ...m,
          team_id: team.id
        }));
        const { error: memberError } = await supabase
          .from("chatbot_team_members")
          .insert(membersToInsert);
        
        if (memberError) throw memberError;
      }

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Equipe criada com sucesso!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao criar equipe.");
    }
  });

  const updateTeam = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Team> & { id: string }) => {
      const { error } = await supabase
        .from("chatbot_agent_teams")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Equipe atualizada!");
    }
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chatbot_agent_teams")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Equipe removida.");
    }
  });

  return {
    teams,
    isLoading,
    createTeam,
    updateTeam,
    deleteTeam
  };
}
