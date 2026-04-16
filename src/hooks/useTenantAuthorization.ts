import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TenantAuthorizationState {
  loading: boolean;
  isOperatingInMasterTenant: boolean;
  isExplicitReseller: boolean;
  canViewGlobalTenantManagement: boolean;
  canViewChildTenantManagement: boolean;
  canCreateChildTenants: boolean;
  canManageChildTenants: boolean;
  canViewTenantTabs: boolean;
  canEditResellerSettings: boolean;
}

const DEFAULT_STATE: TenantAuthorizationState = {
  loading: true,
  isOperatingInMasterTenant: false,
  isExplicitReseller: false,
  canViewGlobalTenantManagement: false,
  canViewChildTenantManagement: false,
  canCreateChildTenants: false,
  canManageChildTenants: false,
  canViewTenantTabs: false,
  canEditResellerSettings: false,
};

export function useTenantAuthorization(): TenantAuthorizationState {
  const { activeCompanyId, isMasterTenantAdmin } = useAuth();
  const [companyState, setCompanyState] = useState(DEFAULT_STATE);

  useEffect(() => {
    if (!activeCompanyId) {
      setCompanyState({ ...DEFAULT_STATE, loading: false });
      return;
    }

    let cancelled = false;

    const loadCompany = async () => {
      const { data } = await supabase
        .from("companies")
        .select(
          "servidor_id, is_reseller, reseller_panel_enabled, can_create_child_tenants, can_manage_child_tenants"
        )
        .eq("id", activeCompanyId)
        .maybeSingle();

      if (cancelled) return;

      const isOperatingInMasterTenant = !!isMasterTenantAdmin && data?.servidor_id === null;
      const isExplicitReseller = !!data?.is_reseller && !!data?.reseller_panel_enabled;
      const canViewGlobalTenantManagement = isOperatingInMasterTenant;
      const canViewChildTenantManagement = isExplicitReseller;
      const canCreateChildTenants = isExplicitReseller && !!data?.can_create_child_tenants;
      const canManageChildTenants = isExplicitReseller && !!data?.can_manage_child_tenants;

      setCompanyState({
        loading: false,
        isOperatingInMasterTenant,
        isExplicitReseller,
        canViewGlobalTenantManagement,
        canViewChildTenantManagement,
        canCreateChildTenants,
        canManageChildTenants,
        canViewTenantTabs: canViewGlobalTenantManagement || canViewChildTenantManagement,
        canEditResellerSettings: isOperatingInMasterTenant,
      });
    };

    loadCompany();

    return () => {
      cancelled = true;
    };
  }, [activeCompanyId, isMasterTenantAdmin]);

  return useMemo(() => companyState, [companyState]);
}