import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "sonner";
import { CrmLeadActivity } from "./useCrmLeads";

export function useCrmActivities(leadId: string | null) {
  const [activities, setActivities] = useState<CrmLeadActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const activeCompanyId = useActiveCompanyId();

  const fetchActivities = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching activities:", error);
    } else {
      setActivities((data as CrmLeadActivity[]) || []);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const addActivity = async (data: { type: string; title: string; description?: string; metadata?: any; servidor_id?: string }) => {
    if (!leadId) return null;
    let servidorId = data.servidor_id || profile?.company_id;
    if (!servidorId) {
      // Get servidor_id from the lead itself
      const { data: leadData } = await supabase.from("crm_leads").select("servidor_id").eq("id", leadId).maybeSingle();
      servidorId = leadData?.servidor_id;
      if (!servidorId) {
        toast.error("Erro ao identificar registro");
        return null;
      }
    }
    return insertActivity(data, servidorId);
  };

  const insertActivity = async (data: { type: string; title: string; description?: string; metadata?: any }, servidorId: string) => {
    if (!leadId) return null;

    const { data: activity, error } = await supabase
      .from("crm_lead_activities")
      .insert({
        lead_id: leadId,
        servidor_id: servidorId,
        type: data.type,
        title: data.title,
        description: data.description || null,
        metadata: data.metadata || null,
        created_by_user_id: profile?.user_id || null,
        created_by_name: profile?.name || null,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao adicionar atividade");
      return null;
    }
    setActivities((prev) => [activity as CrmLeadActivity, ...prev]);
    return activity as CrmLeadActivity;
  };

  const deleteActivity = async (id: string) => {
    const { error } = await supabase.from("crm_lead_activities").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir atividade");
      return false;
    }
    setActivities((prev) => prev.filter((a) => a.id !== id));
    return true;
  };

  return { activities, loading, addActivity, deleteActivity, refetch: fetchActivities };
}
