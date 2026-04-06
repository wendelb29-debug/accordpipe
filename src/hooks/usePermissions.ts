import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePermissions() {
  const { user, role, profile } = useAuth();
  const [roleDefaults, setRoleDefaults] = useState<string[]>([]);
  const [customPerms, setCustomPerms] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { loading: authLoading } = useAuth();

  const isCeoOrMaster = role === "ceo" || profile?.is_master === true;

  useEffect(() => {
    // Wait for auth to finish loading before deciding
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user || !role) {
      setLoading(false);
      return;
    }
    fetchPermissions();
  }, [user, role, authLoading]);

  const fetchPermissions = async () => {
    try {
      const [{ data: defaults }, { data: customs }] = await Promise.all([
        supabase
          .from("role_default_permissions")
          .select("permission_key")
          .eq("role", role!),
        supabase
          .from("user_custom_permissions")
          .select("permission_key, granted")
          .eq("user_id", user!.id),
      ]);

      setRoleDefaults((defaults || []).map(d => d.permission_key));
      const customMap: Record<string, boolean> = {};
      (customs || []).forEach(c => {
        customMap[c.permission_key] = c.granted;
      });
      setCustomPerms(customMap);
    } catch (err) {
      console.error("Error fetching permissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = useCallback((permissionKey: string): boolean => {
    if (isCeoOrMaster) return true;
    // Custom override takes priority
    if (permissionKey in customPerms) return customPerms[permissionKey];
    // Fall back to role defaults
    return roleDefaults.includes(permissionKey);
  }, [isCeoOrMaster, customPerms, roleDefaults]);

  const hasAnyPermission = useCallback((keys: string[]): boolean => {
    return keys.some(k => hasPermission(k));
  }, [hasPermission]);

  return { hasPermission, hasAnyPermission, loading, refetch: fetchPermissions };
}

// Hook to fetch permissions for a specific user (admin use)
export function useUserPermissions(userId: string | null) {
  const [roleDefaults, setRoleDefaults] = useState<string[]>([]);
  const [customPerms, setCustomPerms] = useState<Record<string, boolean>>({});
  const [hasCustom, setHasCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchUserPermissions();
  }, [userId]);

  const fetchUserPermissions = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [{ data: roleData }, { data: customs }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("user_custom_permissions").select("permission_key, granted").eq("user_id", userId),
      ]);

      const role = roleData?.role || "leitura";
      setUserRole(role);

      const { data: defaults } = await supabase
        .from("role_default_permissions")
        .select("permission_key")
        .eq("role", role);

      setRoleDefaults((defaults || []).map(d => d.permission_key));

      const customMap: Record<string, boolean> = {};
      (customs || []).forEach(c => {
        customMap[c.permission_key] = c.granted;
      });
      setCustomPerms(customMap);
      setHasCustom(Object.keys(customMap).length > 0);
    } catch (err) {
      console.error("Error fetching user permissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const getEffectivePermission = (key: string): boolean => {
    if (key in customPerms) return customPerms[key];
    return roleDefaults.includes(key);
  };

  const saveCustomPermissions = async (permissions: Record<string, boolean>) => {
    if (!userId) return;
    // Delete all existing custom permissions, then insert new ones
    await supabase.from("user_custom_permissions").delete().eq("user_id", userId);

    const rows = Object.entries(permissions)
      .map(([permission_key, granted]) => ({
        user_id: userId,
        permission_key,
        granted,
      }));

    if (rows.length > 0) {
      await supabase.from("user_custom_permissions").insert(rows);
    }

    await fetchUserPermissions();
  };

  const clearCustomPermissions = async () => {
    if (!userId) return;
    await supabase.from("user_custom_permissions").delete().eq("user_id", userId);
    setCustomPerms({});
    setHasCustom(false);
    await fetchUserPermissions();
  };

  return {
    roleDefaults,
    customPerms,
    hasCustom,
    loading,
    userRole,
    getEffectivePermission,
    saveCustomPermissions,
    clearCustomPermissions,
    refetch: fetchUserPermissions,
  };
}
