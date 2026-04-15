import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BillingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_user_limit: number;
  extra_free_users_default: number;
  price_per_extra_user: number;
  monthly_price: number;
  yearly_price: number;
  is_custom: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string | null;
  plan_name_snapshot: string;
  base_user_limit_snapshot: number;
  extra_free_users: number;
  extra_paid_users: number;
  effective_user_limit: number;
  price_per_extra_user_snapshot: number;
  billing_cycle: string;
  billing_status: string;
  has_custom_override: boolean;
  created_at: string;
  updated_at: string;
}

export function useBillingPlans() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("billing_plans")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar planos", description: error.message, variant: "destructive" });
    } else {
      setPlans((data as any[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const createPlan = async (plan: Partial<BillingPlan>) => {
    const { error } = await supabase.from("billing_plans").insert(plan as any);
    if (error) {
      toast({ title: "Erro ao criar plano", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Plano criado com sucesso" });
    await fetchPlans();
    return true;
  };

  const updatePlan = async (id: string, updates: Partial<BillingPlan>) => {
    const { error } = await supabase.from("billing_plans").update(updates as any).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar plano", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Plano atualizado" });
    await fetchPlans();
    return true;
  };

  const duplicatePlan = async (plan: BillingPlan) => {
    const { id, created_at, updated_at, ...rest } = plan;
    return createPlan({
      ...rest,
      name: `${rest.name} (cópia)`,
      slug: `${rest.slug}-copy-${Date.now()}`,
      sort_order: rest.sort_order + 1,
    });
  };

  return { plans, loading, fetchPlans, createPlan, updatePlan, duplicatePlan };
}

export function useTenantSubscription(tenantId: string | null) {
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: sub }, { data: countData }] = await Promise.all([
      supabase.from("tenant_subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", tenantId).eq("is_active", true).eq("status", "ativo"),
    ]);
    setSubscription(sub as any);
    setActiveUsers(countData ? (countData as any).length || 0 : 0);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsertSubscription = async (data: Partial<TenantSubscription>) => {
    if (!tenantId) return false;
    const payload = { ...data, tenant_id: tenantId };
    
    if (subscription) {
      const { error } = await supabase.from("tenant_subscriptions").update(payload as any).eq("id", subscription.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return false; }
    } else {
      const { error } = await supabase.from("tenant_subscriptions").insert(payload as any);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return false; }
    }
    toast({ title: "Assinatura atualizada" });
    await fetch();
    return true;
  };

  return { subscription, activeUsers, loading, refetch: fetch, upsertSubscription };
}
