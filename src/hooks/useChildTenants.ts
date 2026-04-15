import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
}

export function useChildTenants() {
  const { activeCompanyId } = useAuth();
  const [children, setChildren] = useState<ChildTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentCompany, setParentCompany] = useState<any>(null);

  const fetchChildren = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      // Get parent info
      const { data: parent } = await supabase
        .from("companies")
        .select("id, is_reseller, can_create_tenants, can_manage_child_tenants, max_child_tenants, tenant_type, nome_fantasia, razao_social")
        .eq("id", activeCompanyId)
        .maybeSingle();

      if (!parent) {
        setLoading(false);
        return;
      }

      setParentCompany(parent);

      // Get children
      const { data: childData } = await supabase
        .from("companies")
        .select("*")
        .or(`parent_tenant_id.eq.${activeCompanyId},created_by_tenant_id.eq.${activeCompanyId}`)
        .neq("id", activeCompanyId)
        .order("created_at", { ascending: false });

      // Get user counts
      const { data: tenantLinks } = await supabase
        .from("user_tenants")
        .select("tenant_id");

      const countMap: Record<string, number> = {};
      (tenantLinks || []).forEach((l: any) => {
        if (l.tenant_id) countMap[l.tenant_id] = (countMap[l.tenant_id] || 0) + 1;
      });

      setChildren(
        (childData || []).map((c: any) => ({
          ...c,
          tenant_type: c.tenant_type || "standard",
          user_count: countMap[c.id] || 0,
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

    // Check limit
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
    createChildTenant,
    toggleChildStatus,
    refetch: fetchChildren,
    canCreate: parentCompany?.can_create_tenants && (!parentCompany?.max_child_tenants || children.length < parentCompany.max_child_tenants),
  };
}
