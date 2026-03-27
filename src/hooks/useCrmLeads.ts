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
  tags?: string[] | null;
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

// Commercial pipeline stages
export const STAGES = [
  { id: "novos", title: "Novos Leads", daysLimit: "1d", color: "bg-emerald-500" },
  { id: "standby", title: "StandBy", daysLimit: "90d", color: "bg-gray-500" },
  { id: "primeiro-contato", title: "1º Contato", daysLimit: "5d", color: "bg-yellow-500" },
  { id: "call-negocio", title: "Call/Negócio", daysLimit: "3d", color: "bg-orange-500" },
  { id: "follow-up-1", title: "Follow-up 1", daysLimit: "15d", color: "bg-purple-500" },
  { id: "follow-up-2", title: "Follow-up 2", daysLimit: "15d", color: "bg-indigo-500" },
  { id: "informe-cs", title: "Inf. p/ CS", daysLimit: "3d", color: "bg-teal-500" },
  { id: "contrato-fechado", title: "Contrato Fechado", daysLimit: "", color: "bg-green-500" },
] as const;

// Admin pipeline stages (Cadastro de Clientes)
export const ADMIN_STAGES = [
  { id: "cadastro-pendente", title: "Cadastro Pendente", daysLimit: "", color: "bg-amber-500" },
  { id: "dados-em-analise", title: "Dados em Análise", daysLimit: "", color: "bg-blue-500" },
  { id: "cadastro-concluido", title: "Cadastro Concluído", daysLimit: "", color: "bg-green-500" },
  { id: "documentacao-pendente", title: "Doc. Pendente", daysLimit: "", color: "bg-red-500" },
] as const;

export const ALL_STAGES = [...STAGES, ...ADMIN_STAGES];

export function useCrmLeads(pipelineType: "commercial" | "admin" = "commercial") {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, role } = useAuth();

  const activeStages = pipelineType === "admin" ? ADMIN_STAGES : STAGES;

  // Check if user has elevated access (can see all leads)
  const canSeeAll = role === "admin" || role === "ceo" || profile?.is_master;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const stageIds = activeStages.map(s => s.id);
    let query = supabase
      .from("crm_leads")
      .select("*")
      .in("stage", stageIds)
      .order("created_at", { ascending: false });

    // User isolation: non-admin/non-master users only see their own leads
    if (!canSeeAll && profile?.user_id) {
      query = query.eq("created_by_user_id", profile.user_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching leads:", error);
      toast.error("Erro ao carregar leads");
    } else {
      setLeads((data as CrmLead[]) || []);
    }
    setLoading(false);
  }, [pipelineType, canSeeAll, profile?.user_id]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const getServidorId = async () => {
    if (profile?.company_id) return profile.company_id;
    const { data } = await supabase
      .from("companies")
      .select("id")
      .is("servidor_id", null)
      .limit(1)
      .maybeSingle();
    return data?.id || null;
  };

  const createLead = async (lead: Partial<CrmLead>) => {
    const servidorId = (lead as any).servidor_id || await getServidorId();
    if (!servidorId) {
      toast.error("Erro ao criar oportunidade - empresa não encontrada");
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
    const allStages = [...STAGES, ...ADMIN_STAGES];
    const oldStage = allStages.find((s) => s.id === lead?.stage);
    const newStage = allStages.find((s) => s.id === stage);
    const oldStageName = oldStage ? `${oldStage.title}${oldStage.daysLimit ? ` (${oldStage.daysLimit})` : ""}` : lead?.stage || "";
    const newStageName = newStage ? `${newStage.title}${newStage.daysLimit ? ` (${newStage.daysLimit})` : ""}` : stage;
    const success = await updateLead(id, { stage, stage_entered_at: new Date().toISOString() } as any);
    if (success && lead) {
      const servidorId = lead.servidor_id;
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

  // Mark as WON and transfer to admin pipeline
  const markAsWonAndTransfer = async (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return false;

    // Update lead: status won, move to admin pipeline stage
    const success = await updateLead(id, {
      lead_status: "won",
      stage: "cadastro-pendente",
      stage_entered_at: new Date().toISOString(),
    } as any);

    if (success) {
      // Log activity
      await supabase.from("crm_lead_activities").insert({
        lead_id: id,
        servidor_id: lead.servidor_id,
        type: "won",
        title: "Oportunidade ganha! Transferida para Cadastro.",
        description: "Lead marcado como ganho e transferido para o pipeline Administrativo (Cadastro Pendente).",
        created_by_user_id: profile?.user_id || null,
        created_by_name: profile?.name || null,
      } as any);

      // Create registration record with lead data
      const regResult = await supabase.from("crm_client_registrations" as any).insert({
        lead_id: id,
        servidor_id: lead.servidor_id,
        nome_completo: lead.contact_name || lead.company_name || "",
        email: lead.email || "",
        created_by_user_id: profile?.user_id || null,
        created_by_name: profile?.name || null,
        plano_contratado: lead.notes?.includes("Plano:") ? lead.notes.split("Plano:")[1]?.trim().split("\n")[0] : null,
        valor_mensal: lead.value_mrr || 0,
        cidade: lead.cidade || null,
        estado: lead.estado || null,
      }).select("id").single();
      const regId = (regResult.data as any)?.id;

      // Auto-create contract linked to registration
      if (regId) {
        const contractResult = await supabase.from("client_contracts").insert({
          registration_id: regId,
          servidor_id: lead.servidor_id,
          lead_id: id,
          client_name: lead.contact_name || lead.company_name || "",
          client_cpf: (lead as any).documento || "",
          plan_name: lead.notes?.includes("Plano:") ? lead.notes.split("Plano:")[1]?.trim().split("\n")[0] : "Plano Padrão",
          monthly_value: lead.value_mrr || 0,
          created_by_user_id: profile?.user_id || null,
          created_by_name: profile?.name || null,
        } as any).select("id").single();
        const contractId = (contractResult.data as any)?.id;

        // Auto-generate first financial transaction (monthly charge)
        if (lead.value_mrr > 0) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 1);
          dueDate.setDate(10); // Default billing day

          await supabase.from("financial_transactions").insert({
            servidor_id: lead.servidor_id,
            registration_id: regId,
            lead_id: id,
            amount: lead.value_mrr,
            type: "cobranca",
            description: `Mensalidade - ${lead.contact_name || lead.company_name}`,
            status: "pendente",
            due_date: dueDate.toISOString().split("T")[0],
            created_by_user_id: profile?.user_id || null,
            created_by_name: profile?.name || null,
          } as any);
        }

        // Log contract creation in history
        if (contractId) {
          await supabase.from("client_contract_history").insert({
            contract_id: contractId,
            action: "Contrato criado automaticamente",
            description: `Contrato gerado automaticamente a partir da venda CRM. Vendedor: ${profile?.name || "Sistema"}. Valor: R$ ${(lead.value_mrr || 0).toFixed(2)}/mês`,
            created_by_name: profile?.name || "Sistema",
          } as any);
        }
      }

      // Notify administrativo users
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("company_id", lead.servidor_id)
        .eq("is_active", true);

      if (adminProfiles) {
        for (const ap of adminProfiles) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", ap.user_id)
            .maybeSingle();

          if (roleData?.role === "administrativo" || roleData?.role === "admin") {
            await supabase.rpc("create_notification", {
              _user_id: ap.user_id,
              _title: "Novo cadastro pendente",
              _message: `A oportunidade "${lead.company_name}" foi marcada como ganha e aguarda cadastro. Contrato e cobrança foram gerados automaticamente.`,
              _type: "cadastro_pendente",
            });
          }
        }
      }

      // Remove from local state (it moved to admin pipeline)
      if (pipelineType === "commercial") {
        setLeads((prev) => prev.filter((l) => l.id !== id));
      }

      toast.success("🎉 Oportunidade ganha! Contrato, cadastro e cobrança gerados automaticamente.");
    }
    return success;
  };

  const totalLeads = leads.length;
  const totalPS = leads.reduce((s, l) => s + (l.value_ps || 0), 0);
  const totalMRR = leads.reduce((s, l) => s + (l.value_mrr || 0), 0);

  const stageStats = activeStages.map((stage) => {
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
    markAsWonAndTransfer,
    refetch: fetchLeads,
    totalLeads,
    totalPS,
    totalMRR,
    stageStats,
    activeStages,
  };
}
