import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MasterTenantClient {
  id: string;
  tenant_id: string;
  master_client_id: string;
  tenant_type: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  responsavel: string | null;
  status: string;
  activation_date: string | null;
  plan_name: string | null;
  plan_id: string | null;
  billing_cycle: string;
  contracted_value: number;
  contracted_users: number;
  active_users_count: number;
  max_users: number;
  next_due_date: string | null;
  grace_days: number;
  grace_until: string | null;
  blocked_at: string | null;
  subscription_status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export interface MasterBillingRecord {
  id: string;
  tenant_id: string;
  master_client_id: string | null;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  payment_method: string | null;
  asaas_payment_id: string | null;
  invoice_url: string | null;
  bank_slip_url: string | null;
  pix_payload: string | null;
  pix_qrcode_url: string | null;
  grace_until: string | null;
  blocking_date: string | null;
  notes: string | null;
  created_at: string;
}

type Filter = {
  subscription_status?: string;
  payment_status?: string;
  billing_cycle?: string;
  tenant_type?: string;
  due_range?: "today" | "this_week" | null;
};

export function useMasterTenantClients() {
  const [clients, setClients] = useState<MasterTenantClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filter>({});

  const fetchClients = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("master_tenant_clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters.subscription_status) {
      query = query.eq("subscription_status", filters.subscription_status);
    }
    if (filters.payment_status) {
      query = query.eq("payment_status", filters.payment_status);
    }
    if (filters.billing_cycle) {
      query = query.eq("billing_cycle", filters.billing_cycle);
    }
    if (filters.tenant_type) {
      query = query.eq("tenant_type", filters.tenant_type);
    }
    if (filters.due_range === "today") {
      const today = new Date().toISOString().split("T")[0];
      query = query.eq("next_due_date", today);
    } else if (filters.due_range === "this_week") {
      const today = new Date();
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
      query = query
        .gte("next_due_date", today.toISOString().split("T")[0])
        .lte("next_due_date", endOfWeek.toISOString().split("T")[0]);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching master tenant clients:", error);
    }
    setClients((data as unknown as MasterTenantClient[]) || []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const updateClient = async (id: string, updates: Partial<MasterTenantClient>) => {
    const { error } = await supabase
      .from("master_tenant_clients")
      .update(updates as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return false;
    }
    toast.success("Cliente atualizado!");
    fetchClients();
    return true;
  };

  const syncUserCount = async (tenantId: string) => {
    await supabase.rpc("sync_master_client_user_count", { _tenant_id: tenantId });
    fetchClients();
  };

  const fetchBillingHistory = async (tenantId: string): Promise<MasterBillingRecord[]> => {
    const { data } = await supabase
      .from("master_billing_history")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("due_date", { ascending: false })
      .limit(20);
    return (data as unknown as MasterBillingRecord[]) || [];
  };

  const createBillingRecord = async (record: Partial<MasterBillingRecord>) => {
    const { error } = await supabase
      .from("master_billing_history")
      .insert(record as any);
    if (error) {
      toast.error("Erro ao criar cobrança: " + error.message);
      return false;
    }
    toast.success("Cobrança registrada!");
    return true;
  };

  return {
    clients,
    loading,
    filters,
    setFilters,
    fetchClients,
    updateClient,
    syncUserCount,
    fetchBillingHistory,
    createBillingRecord,
  };
}
