import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DataScope } from "@/lib/permissions";
import { LEGACY_PERMISSION_MAP } from "@/lib/permissions";

interface PermissionEntry {
  granted: boolean;
  data_scope: DataScope;
}

function resolveKey(key: string): string {
  return LEGACY_PERMISSION_MAP[key] || key;
}

export function usePermissions() {
  const { user, role, profile } = useAuth();
  const [roleDefaults, setRoleDefaults] = useState<Record<string, PermissionEntry>>({});
  const [customPerms, setCustomPerms] = useState<Record<string, PermissionEntry>>({});
  const [loading, setLoading] = useState(true);
  const { loading: authLoading } = useAuth();

  const isCeoOrMaster = role === "ceo" || role === "master" || profile?.is_master === true;

  useEffect(() => {
    if (authLoading) { setLoading(true); return; }
    if (!user || !role) { setLoading(false); return; }
    fetchPermissions();
  }, [user, role, authLoading]);

  const fetchPermissions = async () => {
    try {
      const [{ data: defaults }, { data: customs }] = await Promise.all([
        supabase
          .from("role_default_permissions")
          .select("permission_key, data_scope")
          .eq("role", role!),
        supabase
          .from("user_custom_permissions")
          .select("permission_key, granted, data_scope")
          .eq("user_id", user!.id),
      ]);

      const defaultMap: Record<string, PermissionEntry> = {};
      (defaults || []).forEach(d => {
        defaultMap[d.permission_key] = { granted: true, data_scope: (d.data_scope as DataScope) || "own" };
      });
      setRoleDefaults(defaultMap);

      const customMap: Record<string, PermissionEntry> = {};
      (customs || []).forEach(c => {
        customMap[c.permission_key] = { granted: c.granted, data_scope: (c.data_scope as DataScope) || "own" };
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
    const key = resolveKey(permissionKey);
    if (key in customPerms) return customPerms[key].granted;
    return key in roleDefaults;
  }, [isCeoOrMaster, customPerms, roleDefaults]);

  const getDataScope = useCallback((permissionKey: string): DataScope => {
    if (isCeoOrMaster) return "all";
    const key = resolveKey(permissionKey);
    if (key in customPerms && customPerms[key].granted) return customPerms[key].data_scope;
    if (key in roleDefaults) return roleDefaults[key].data_scope;
    return "own";
  }, [isCeoOrMaster, customPerms, roleDefaults]);

  const hasAnyPermission = useCallback((keys: string[]): boolean => {
    return keys.some(k => hasPermission(k));
  }, [hasPermission]);

  return { hasPermission, hasAnyPermission, getDataScope, loading, refetch: fetchPermissions };
}

// Hook to fetch permissions for a specific user (admin use)
export function useUserPermissions(userId: string | null) {
  const [roleDefaults, setRoleDefaults] = useState<Record<string, PermissionEntry>>({});
  const [customPerms, setCustomPerms] = useState<Record<string, PermissionEntry>>({});
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
        supabase.from("user_custom_permissions").select("permission_key, granted, data_scope").eq("user_id", userId),
      ]);

      const role = roleData?.role || "leitura";
      setUserRole(role);

      const { data: defaults } = await supabase
        .from("role_default_permissions")
        .select("permission_key, data_scope")
        .eq("role", role);

      const defaultMap: Record<string, PermissionEntry> = {};
      (defaults || []).forEach(d => {
        defaultMap[d.permission_key] = { granted: true, data_scope: (d.data_scope as DataScope) || "own" };
      });
      setRoleDefaults(defaultMap);

      const customMap: Record<string, PermissionEntry> = {};
      (customs || []).forEach(c => {
        customMap[c.permission_key] = { granted: c.granted, data_scope: (c.data_scope as DataScope) || "own" };
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
    if (key in customPerms) return customPerms[key].granted;
    return key in roleDefaults;
  };

  const getEffectiveScope = (key: string): DataScope => {
    if (key in customPerms && customPerms[key].granted) return customPerms[key].data_scope;
    if (key in roleDefaults) return roleDefaults[key].data_scope;
    return "own";
  };

  const saveCustomPermissions = async (permissions: Record<string, { granted: boolean; data_scope: DataScope }>) => {
    if (!userId) return;
    await supabase.from("user_custom_permissions").delete().eq("user_id", userId);

    const rows = Object.entries(permissions).map(([permission_key, val]) => ({
      user_id: userId,
      permission_key,
      granted: val.granted,
      data_scope: val.data_scope,
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
    getEffectiveScope,
    saveCustomPermissions,
    clearCustomPermissions,
    refetch: fetchUserPermissions,
  };
}
