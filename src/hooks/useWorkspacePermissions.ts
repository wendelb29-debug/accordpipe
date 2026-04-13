import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export interface WorkspacePermission {
  id: string;
  tenant_id: string;
  user_id: string;
  workspace_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export function useWorkspacePermissions() {
  const { user, role, profile } = useAuth();
  const companyId = useActiveCompanyId();
  const [permissions, setPermissions] = useState<WorkspacePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const isCeoOrMaster = role === "ceo" || role === "master" || profile?.is_master === true;

  const fetchPermissions = useCallback(async () => {
    if (!user || !companyId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_workspace_permissions")
      .select("*")
      .eq("user_id", user.id)
      .eq("tenant_id", companyId);

    if (error) {
      console.error("Error fetching workspace permissions:", error);
    } else {
      setPermissions((data || []) as WorkspacePermission[]);
    }
    setLoading(false);
  }, [user, companyId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const canViewWorkspace = useCallback(
    (workspaceId: string): boolean => {
      if (isCeoOrMaster) return true;
      // Admin role also gets full access
      if (role === "admin") return true;
      const perm = permissions.find((p) => p.workspace_id === workspaceId);
      return perm?.can_view ?? false;
    },
    [isCeoOrMaster, role, permissions]
  );

  const canEditWorkspace = useCallback(
    (workspaceId: string): boolean => {
      if (isCeoOrMaster) return true;
      if (role === "admin") return true;
      const perm = permissions.find((p) => p.workspace_id === workspaceId);
      return perm?.can_edit ?? false;
    },
    [isCeoOrMaster, role, permissions]
  );

  const canDeleteInWorkspace = useCallback(
    (workspaceId: string): boolean => {
      if (isCeoOrMaster) return true;
      if (role === "admin") return true;
      const perm = permissions.find((p) => p.workspace_id === workspaceId);
      return perm?.can_delete ?? false;
    },
    [isCeoOrMaster, role, permissions]
  );

  const filterAllowedWorkspaces = useCallback(
    <T extends { id: string }>(workspaces: T[]): T[] => {
      if (isCeoOrMaster || role === "admin") return workspaces;
      return workspaces.filter((ws) => canViewWorkspace(ws.id));
    },
    [isCeoOrMaster, role, canViewWorkspace]
  );

  return {
    permissions,
    loading,
    isCeoOrMaster,
    canViewWorkspace,
    canEditWorkspace,
    canDeleteInWorkspace,
    filterAllowedWorkspaces,
    refresh: fetchPermissions,
  };
}

// Hook for admin to manage workspace permissions for a specific user
export function useUserWorkspacePermissions(userId: string | null, tenantId: string | null) {
  const [permissions, setPermissions] = useState<WorkspacePermission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!userId || !tenantId) {
      setPermissions([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_workspace_permissions")
      .select("*")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Error fetching user workspace permissions:", error);
    } else {
      setPermissions((data || []) as WorkspacePermission[]);
    }
    setLoading(false);
  }, [userId, tenantId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const savePermissions = async (
    perms: { workspace_id: string; can_view: boolean; can_edit: boolean; can_delete: boolean }[]
  ) => {
    if (!userId || !tenantId) return;

    // Delete existing
    await supabase
      .from("user_workspace_permissions")
      .delete()
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    // Insert new ones (only those with at least one permission)
    const rows = perms
      .filter((p) => p.can_view || p.can_edit || p.can_delete)
      .map((p) => ({
        tenant_id: tenantId,
        user_id: userId,
        workspace_id: p.workspace_id,
        can_view: p.can_view,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from("user_workspace_permissions").insert(rows);
      if (error) {
        console.error("Error saving workspace permissions:", error);
        throw error;
      }
    }

    await fetchPermissions();
  };

  return { permissions, loading, savePermissions, refresh: fetchPermissions };
}
