import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CrmLead {
  id: string;
  servidor_id: string;
  company_id: string | null;
  source: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  value_ps: number;
  value_mrr: number;
  stage: string;
  stage_entered_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  created_by_name: string | null;
  cidade: string | null;
  estado: string | null;
  forecast_date: string | null;
  lead_status: string;
  lost_reason: string | null;
}

export interface CrmLeadActivity {
  id: string;
  lead_id: string;
  servidor_id: string;
  type: string;
  title: string;
  description: string | null;
  created_by_user_id: string | null;
  created_by_name: string | null;
  metadata: any;
  created_at: string;
}

export const STAGES = [
  { id: "novos", title: "Novos Leads", daysLimit: "1d", color: "bg-emerald-500" },
  { id: "standby", title: "StandBy", daysLimit: "90d", color: "bg-gray-500" },
  { id: "candidatos", title: "Candidatos", daysLimit: "1d", color: "bg-blue-500" },
  { id: "primeiro-contato", title: "1º Contato", daysLimit: "5d", color: "bg-yellow-500" },
  { id: "call-negocio", title: "Call/Negócio", daysLimit: "3d", color: "bg-orange-500" },
  { id: "follow-up-1", title: "Follow-up 1", daysLimit: "15d", color: "bg-purple-500" },
  { id: "follow-up-2", title: "Follow-up 2", daysLimit: "15d", color: "bg-indigo-500" },
  { id: "informe-cs", title: "Inf. p/ CS", daysLimit: "3d", color: "bg-teal-500" },
  { id: "contrato-fechado", title: "Contrato Fechado", daysLimit: "", color: "bg-green-500" },
] as const;

export function useCrmLeads() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompanyId, profile, isMaster } = useAuth();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("crm_leads").select("*").order("created_at", { ascending: false });

    // Master without activeCompanyId sees all leads
    if (activeCompanyId) {
      query = query.eq("servidor_id", activeCompanyId);
    } else if (!isMaster && profile?.company_id) {
      query = query.eq("servidor_id", profile.company_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching leads:", error);
      toast.error("Erro ao carregar leads");
    } else {
      setLeads((data as CrmLead[]) || []);
    }
    setLoading(false);
  }, [activeCompanyId, profile?.company_id]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const createLead = async (lead: Partial<CrmLead>) => {
    // Allow servidor_id override from lead data (master selecting different servidor)
    const servidorId = (lead as any).servidor_id || activeCompanyId || profile?.company_id;
    if (!servidorId) {
      toast.error("Selecione um servidor");
      return null;
    }
    const { data, error } = await supabase
      .from("crm_leads")
      .insert({ ...lead, servidor_id: servidorId } as any)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar lead");
      return null;
    }
    setLeads((prev) => [data as CrmLead, ...prev]);
    toast.success("Oportunidade criada!");
    return data as CrmLead;
  };

  const updateLead = async (id: string, updates: Partial<CrmLead>) => {
    const { error } = await supabase.from("crm_leads").update(updates as any).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar lead");
      return false;
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    return true;
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir lead");
      return false;
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success("Oportunidade excluída");
    return true;
  };

  const moveToStage = async (id: string, stage: string) => {
    const lead = leads.find((l) => l.id === id);
    const oldStage = STAGES.find((s) => s.id === lead?.stage);
    const newStage = STAGES.find((s) => s.id === stage);
    const oldStageName = oldStage ? `${oldStage.title}${oldStage.daysLimit ? ` (${oldStage.daysLimit})` : ""}` : lead?.stage || "";
    const newStageName = newStage ? `${newStage.title}${newStage.daysLimit ? ` (${newStage.daysLimit})` : ""}` : stage;
    const success = await updateLead(id, { stage, stage_entered_at: new Date().toISOString() } as any);
    if (success && lead) {
      const servidorId = activeCompanyId || profile?.company_id;
      if (servidorId) {
        await supabase.from("crm_lead_activities").insert({
          lead_id: id,
          servidor_id: servidorId,
          type: "stage_change",
          title: `Mudou de etapa`,
          description: `Esta oportunidade passou da etapa **${oldStageName}** para a etapa **${newStageName}**.`,
          created_by_user_id: profile?.user_id || null,
          created_by_name: profile?.name || null,
        } as any);
      }
    }
    return success;
  };

  // Computed stats
  const totalLeads = leads.length;
  const totalPS = leads.reduce((s, l) => s + (l.value_ps || 0), 0);
  const totalMRR = leads.reduce((s, l) => s + (l.value_mrr || 0), 0);

  const stageStats = STAGES.map((stage) => {
    const stageLeads = leads.filter((l) => l.stage === stage.id);
    return {
      ...stage,
      count: stageLeads.length,
      totalPS: stageLeads.reduce((s, l) => s + (l.value_ps || 0), 0),
      totalMRR: stageLeads.reduce((s, l) => s + (l.value_mrr || 0), 0),
    };
  });

  return {
    leads,
    loading,
    createLead,
    updateLead,
    deleteLead,
    moveToStage,
    refetch: fetchLeads,
    totalLeads,
    totalPS,
    totalMRR,
    stageStats,
  };
}
