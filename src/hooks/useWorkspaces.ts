import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import { toast } from "sonner";

export interface Workspace {
  id: string;
  name: string;
  servidor_id: string;
  color: string;
  icon: string;
  is_default: boolean;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  type?: string;
  group_id?: string | null;
  sort_order?: number;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  created_at: string;
}

const LAST_WORKSPACE_KEY = "accord-last-workspace";

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    () => localStorage.getItem(LAST_WORKSPACE_KEY)
  );
  const [loading, setLoading] = useState(true);
  const { profile, role } = useAuth();
  const companyId = useActiveCompanyId();

  const isAdminOrCeo = role === "admin" || role === "ceo" || profile?.is_master;

  const fetchWorkspaces = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("servidor_id", companyId)
      .order("is_default", { ascending: false })
      .order("name");

    if (error) {
      console.error("Error fetching workspaces:", error);
    } else {
      const ws = filterAllowedWorkspaces((data || []) as Workspace[]);
      setWorkspaces(ws);

      // Auto-select: last used, or default, or first
      if (ws.length > 0) {
        const lastId = localStorage.getItem(LAST_WORKSPACE_KEY);
        const found = ws.find((w) => w.id === lastId);
        if (found) {
          setActiveWorkspaceId(found.id);
        } else {
          const def = ws.find((w) => w.is_default) || ws[0];
          setActiveWorkspaceId(def.id);
          localStorage.setItem(LAST_WORKSPACE_KEY, def.id);
        }
      }
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const selectWorkspace = (id: string) => {
    setActiveWorkspaceId(id);
    localStorage.setItem(LAST_WORKSPACE_KEY, id);
  };

  const createWorkspace = async (name: string, color = "#7C3AED") => {
    if (!companyId) return null;
    const { data, error } = await supabase
      .from("workspaces")
      .insert({
        name,
        servidor_id: companyId,
        color,
        created_by_user_id: profile?.user_id,
        is_default: workspaces.length === 0,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar workspace");
      return null;
    }

    const ws = data as Workspace;
    setWorkspaces((prev) => [...prev, ws]);
    toast.success(`Workspace "${name}" criado!`);
    return ws;
  };

  const updateWorkspace = async (id: string, updates: Partial<Pick<Workspace, "name" | "color" | "icon">>) => {
    const { error } = await supabase
      .from("workspaces")
      .update(updates as any)
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar workspace");
      return;
    }
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
    toast.success("Workspace atualizado!");
  };

  const deleteWorkspace = async (id: string) => {
    if (workspaces.find((w) => w.id === id)?.is_default) {
      toast.error("Não é possível excluir o workspace padrão");
      return;
    }
    const { error } = await supabase.from("workspaces").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir workspace");
      return;
    }
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (activeWorkspaceId === id) {
      const def = workspaces.find((w) => w.is_default && w.id !== id) || workspaces.find((w) => w.id !== id);
      if (def) selectWorkspace(def.id);
    }
    toast.success("Workspace excluído!");
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    loading,
    isAdminOrCeo,
    refresh: fetchWorkspaces,
  };
}
