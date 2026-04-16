import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ChildTenantSubscription {
  plan_name: string | null;
  billing_cycle: string | null;
  billing_status: string | null;
  payment_status: string | null;
  valor_mensal_total: number | null;
  next_due_date: string | null;
  grace_days: number | null;
  grace_until: string | null;
  blocked_at: string | null;
  effective_user_limit: number | null;
  extra_paid_users: number | null;
  start_date: string | null;
}

export interface ChildTenant {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  responsavel: string | null;
  status: string;
  created_at: string;
  tenant_type: string;
  user_count: number;
  subscription: ChildTenantSubscription | null;
}

export interface ResellerPermissions {
  can_create_tenants: boolean;
  can_manage_child_tenants: boolean;
  can_create_child_tenants: boolean;
  can_edit_child_tenants: boolean;
  can_suspend_child_tenants: boolean;
  can_reactivate_child_tenants: boolean;
  can_view_child_billing: boolean;
}

export function useChildTenants() {
  const { activeCompanyId } = useAuth();
  const [children, setChildren] = useState<ChildTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentCompany, setParentCompany] = useState<any>(null);
  const [permissions, setPermissions] = useState<ResellerPermissions>({
    can_create_tenants: false,
    can_manage_child_tenants: false,
    can_create_child_tenants: false,
    can_edit_child_tenants: false,
    can_suspend_child_tenants: false,
    can_reactivate_child_tenants: false,
    can_view_child_billing: false,
  });

  const fetchChildren = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const { data: parent } = await supabase
        .from("companies")
        .select("id, is_reseller, can_create_tenants, can_manage_child_tenants, max_child_tenants, tenant_type, nome_fantasia, razao_social, reseller_panel_enabled")
        .eq("id", activeCompanyId)
        .maybeSingle();

      if (!parent) {
        setLoading(false);
        return;
      }

      setParentCompany(parent);

      // Derive permissions from parent company flags
      const isReseller = (parent as any).is_reseller || false;
      const canCreate = (parent as any).can_create_tenants || false;
      const canManage = (parent as any).can_manage_child_tenants || false;
      setPermissions({
        can_create_tenants: canCreate,
        can_manage_child_tenants: canManage,
        can_create_child_tenants: canCreate,
        can_edit_child_tenants: canManage,
        can_suspend_child_tenants: canManage,
        can_reactivate_child_tenants: canManage,
        can_view_child_billing: isReseller,
      });

      // Get children
      const { data: childData } = await supabase
        .from("companies")
        .select("*")
        .or(`parent_tenant_id.eq.${activeCompanyId},created_by_tenant_id.eq.${activeCompanyId}`)
        .neq("id", activeCompanyId)
        .order("created_at", { ascending: false });

      const childIds = (childData || []).map((c: any) => c.id);

      // Get subscriptions and user counts in parallel
      const [{ data: subscriptions }, { data: profiles }] = await Promise.all([
        childIds.length > 0
          ? supabase.from("tenant_subscriptions").select("tenant_id, plan_name_snapshot, billing_cycle, billing_status, payment_status, valor_mensal_total, next_due_date, grace_days, grace_until, blocked_at, effective_user_limit, extra_paid_users, start_date").in("tenant_id", childIds)
          : Promise.resolve({ data: [] }),
        childIds.length > 0
          ? supabase.from("profiles").select("company_id").in("company_id", childIds).eq("is_active", true)
          : Promise.resolve({ data: [] }),
      ]);

      const subMap: Record<string, ChildTenantSubscription> = {};
      (subscriptions || []).forEach((s: any) => {
        subMap[s.tenant_id] = {
          plan_name: s.plan_name_snapshot,
          billing_cycle: s.billing_cycle,
          billing_status: s.billing_status,
          payment_status: s.payment_status,
          valor_mensal_total: s.valor_mensal_total,
          next_due_date: s.next_due_date,
          grace_days: s.grace_days,
          grace_until: s.grace_until,
          blocked_at: s.blocked_at,
          effective_user_limit: s.effective_user_limit,
          extra_paid_users: s.extra_paid_users,
          start_date: s.start_date,
        };
      });

      const countMap: Record<string, number> = {};
      (profiles || []).forEach((p: any) => {
        if (p.company_id) countMap[p.company_id] = (countMap[p.company_id] || 0) + 1;
      });

      setChildren(
        (childData || []).map((c: any) => ({
          ...c,
          tenant_type: c.tenant_type || "standard",
          user_count: countMap[c.id] || 0,
          subscription: subMap[c.id] || null,
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar tenants filhos");
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const createChildTenant = async (data: {
    razao_social: string;
    nome_fantasia?: string;
    cnpj: string;
    email?: string;
    telefone?: string;
    responsavel?: string;
  }) => {
    if (!activeCompanyId || !parentCompany) return false;

    if (parentCompany.max_child_tenants && children.length >= parentCompany.max_child_tenants) {
      toast.error("Limite de tenants filhos atingido");
      return false;
    }

    try {
      const { error } = await supabase.from("companies").insert({
        ...data,
        parent_tenant_id: activeCompanyId,
        created_by_tenant_id: activeCompanyId,
        tenant_type: "standard",
        status: "active",
      } as any);

      if (error) {
        if (error.code === "23505") {
          toast.error("CNPJ já cadastrado!");
        } else {
          throw error;
        }
        return false;
      }

      toast.success("Tenant filho criado com sucesso!");
      await fetchChildren();
      return true;
    } catch (err: any) {
      toast.error("Erro ao criar tenant filho: " + (err.message || ""));
      return false;
    }
  };

  const toggleChildStatus = async (childId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase.from("companies").update({ status: newStatus }).eq("id", childId);
      if (error) throw error;
      toast.success(newStatus === "active" ? "Tenant ativado" : "Tenant bloqueado");
      await fetchChildren();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  return {
    children,
    loading,
    parentCompany,
    permissions,
    createChildTenant,
    toggleChildStatus,
    refetch: fetchChildren,
    canCreate: permissions.can_create_child_tenants && (!parentCompany?.max_child_tenants || children.length < parentCompany.max_child_tenants),
  };
}
