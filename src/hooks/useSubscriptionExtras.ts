import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SubscriptionExtra {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  name: string;
  value: number;
  type: "recorrente" | "unico";
  is_active: boolean;
  is_selected: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscriptionExtras(tenantId: string | null) {
  const [extras, setExtras] = useState<SubscriptionExtra[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExtras = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription_extras" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
    } else {
      setExtras((data as any[]) || []);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchExtras(); }, [fetchExtras]);

  const totalRecorrentes = useMemo(
    () => extras.filter(e => e.is_active && e.is_selected && e.type === "recorrente").reduce((s, e) => s + Number(e.value), 0),
    [extras]
  );

  const totalUnicos = useMemo(
    () => extras.filter(e => e.is_active && e.is_selected && e.type === "unico").reduce((s, e) => s + Number(e.value), 0),
    [extras]
  );

  const addExtra = async (extra: Partial<SubscriptionExtra>) => {
    if (!tenantId) return false;
    const { error } = await supabase.from("subscription_extras" as any).insert({ ...extra, tenant_id: tenantId } as any);
    if (error) { toast.error("Erro ao adicionar extra: " + error.message); return false; }
    toast.success("Extra adicionado");
    await fetchExtras();
    return true;
  };

  const updateExtra = async (id: string, updates: Partial<SubscriptionExtra>) => {
    const { error } = await supabase.from("subscription_extras" as any).update(updates as any).eq("id", id);
    if (error) { toast.error("Erro ao atualizar extra: " + error.message); return false; }
    await fetchExtras();
    return true;
  };

  const removeExtra = async (id: string) => {
    const { error } = await supabase.from("subscription_extras" as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao remover extra: " + error.message); return false; }
    toast.success("Extra removido");
    await fetchExtras();
    return true;
  };

  const toggleSelected = async (id: string, selected: boolean) => {
    return updateExtra(id, { is_selected: selected });
  };

  return { extras, loading, totalRecorrentes, totalUnicos, addExtra, updateExtra, removeExtra, toggleSelected, refetch: fetchExtras };
}
