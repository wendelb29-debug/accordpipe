import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";
import type { Database } from "@/integrations/supabase/types";

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
      // chatbot_agent_teams expects team_id (FK to chatbot_teams)
      // Since we are rebuilding, we either need to create a chatbot_teams entry first 
      // or satisfy the constraint.
      let teamId = (teamData as any).team_id;
      if (!teamId) {
         const { data: baseTeam, error: baseError } = await supabase
           .from("chatbot_teams" as any)
           .insert([{ 
             name: teamData.name || "Nova Equipe",
             tenant_id: profile.company_id 
           }])
           .select()
           .single();
         if (baseError) throw baseError;
         teamId = baseTeam.id;
      }

      const { data: team, error: teamError } = await supabase
        .from("chatbot_agent_teams")
        .insert([{ 
          ...teamData, 
          tenant_id: profile.company_id,
          team_id: teamId,
          is_enabled: true,
          config: {}
        } as any])
        .select()
        .single();

      if (teamError) throw teamError;

      // 3. Add members if provided
      if (members && members.length > 0) {
        const membersToInsert = members.map(m => ({
          user_id: m.user_id,
          member_role: m.member_role || 'agent',
          priority: m.priority || 1,
          max_concurrent: m.max_concurrent,
          member_status: m.member_status || 'active',
          team_id: team.id,
          tenant_id: profile.company_id,
          role: m.member_role || 'agent' // Compatibility with existing 'role' column
        }));
        
        const { error: memberError } = await supabase
          .from("chatbot_team_members")
          .insert(membersToInsert as any);
        
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
        .update(updates as any)
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
        .update({ deleted_at: new Date().toISOString() } as any)
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
