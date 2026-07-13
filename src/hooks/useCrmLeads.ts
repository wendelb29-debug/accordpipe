import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "sonner";
import { getOrCreateCadastroWorkspace, resolveWonDestination } from "@/lib/cadastroWorkspace";
import { captureAppError } from "@/lib/monitoring";


export interface CrmLead {
  id: string;
  servidor_id: string;
  company_id: string | null;
  source: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  documento: string | null;
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
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  complemento: string | null;
  forecast_date: string | null;
  lead_status: string;
  lost_reason: string | null;
  tags?: string[] | null;
  workspace_id?: string | null;
  origin_workspace_id?: string | null;
  origin_stage?: string | null;
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

// Commercial pipeline stages (fallback when no dynamic columns)
export const STAGES = [
  { id: "standby", title: "StandBy", daysLimit: "90d", color: "bg-gray-500" },
  { id: "novos", title: "Novos Leads", daysLimit: "1d", color: "bg-emerald-500" },
  { id: "primeiro-contato", title: "1º Contato", daysLimit: "5d", color: "bg-yellow-500" },
  { id: "call-negocio", title: "Call/Negócio", daysLimit: "3d", color: "bg-orange-500" },
  { id: "follow-up-1", title: "Follow-up 1", daysLimit: "15d", color: "bg-purple-500" },
  { id: "follow-up-2", title: "Follow-up 2", daysLimit: "15d", color: "bg-indigo-500" },
  { id: "contrato-fechado", title: "Contrato Fechado", daysLimit: "", color: "bg-green-500" },
] as const;

// Admin pipeline stages (Cadastro de Clientes)
export const ADMIN_STAGES = [
  { id: "cadastro-pendente", title: "Cadastro Pendente", daysLimit: "", color: "bg-amber-500" },
  { id: "dados-em-analise", title: "Dados em Análise", daysLimit: "", color: "bg-blue-500" },
  { id: "documentacao-pendente", title: "Doc. Pendente", daysLimit: "", color: "bg-red-500" },
  { id: "cadastro-concluido", title: "Cadastro Concluído", daysLimit: "", color: "bg-green-500" },
] as const;

export const ALL_STAGES = [...STAGES, ...ADMIN_STAGES];

export interface DynamicStage {
  id: string;
  title: string;
  daysLimit: string;
  color: string;
  rawColor?: string;
  sla_days?: number;
  allow_mark_as_won?: boolean;
}

export function useCrmLeads(
  pipelineType: "commercial" | "admin" = "commercial",
  workspaceId?: string | null,
  dynamicStages?: DynamicStage[]
) {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, role } = useAuth();
  const companyId = useActiveCompanyId();

  // Use dynamic stages if provided, otherwise fallback to hardcoded
  const activeStages: readonly { id: string; title: string; daysLimit: string; color: string }[] =
    dynamicStages && dynamicStages.length > 0
      ? dynamicStages
      : pipelineType === "admin"
        ? ADMIN_STAGES
        : STAGES;

  const canSeeAll = role === "admin" || role === "ceo" || profile?.is_master;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const stageIds = activeStages.map(s => s.id);
    let query = supabase
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false });


    if (!canSeeAll && profile?.user_id) {
      query = query.eq("created_by_user_id", profile.user_id);
    }

    if (workspaceId) {
      // Inclui leads deste workspace OU leads cuja ORIGEM é este workspace
      // (ganhos transferidos para o Cadastro), para que Ganho/Perdido/Lixeira
      // apareçam mesmo quando a etapa atual não pertence mais a este funil.
      query = query.or(`workspace_id.eq.${workspaceId},origin_workspace_id.eq.${workspaceId}`);
    } else {
      // Sem workspace: restringe às etapas ativas do funil (comportamento original)
      query = query.in("stage", stageIds);
    }

    const { data, error } = await query;

    if (error) {
      captureAppError(error, { module: "crm_leads", action: "fetch", tenantId: companyId, metadata: { workspaceId, pipelineType } });
      toast.error("Erro ao carregar leads");
    } else {
      setLeads((data as CrmLead[]) || []);
    }

    setLoading(false);
  }, [pipelineType, canSeeAll, profile?.user_id, workspaceId, activeStages.map(s => s.id).join(",")]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const getServidorId = async () => {
    if (companyId) return companyId;
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
    const insertData: any = { ...lead, servidor_id: servidorId };
    if (workspaceId) insertData.workspace_id = workspaceId;

    // Set default stage to first dynamic column if available
    if (!insertData.stage && activeStages.length > 0) {
      insertData.stage = activeStages[0].id;
    }

    const { data, error } = await supabase
      .from("crm_leads")
      .insert(insertData)
      .select()
      .single();
    if (error) {
      captureAppError(error, { module: "crm_leads", action: "create", tenantId: servidorId });
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
      captureAppError(error, { module: "crm_leads", action: "update", metadata: { id } });
      toast.error("Erro ao atualizar lead");
      return false;
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    return true;

  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (error) {
      captureAppError(error, { module: "crm_leads", action: "delete", metadata: { id } });
      toast.error("Erro ao excluir lead");
      return false;
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success("Oportunidade excluída");
    return true;
  };


  const moveToStage = async (id: string, stage: string) => {
    const lead = leads.find((l) => l.id === id);
    const allStages = [...activeStages, ...ADMIN_STAGES];
    const oldStage = allStages.find((s) => s.id === lead?.stage);
    const newStage = allStages.find((s) => s.id === stage);
    const oldStageName = oldStage ? `${oldStage.title}${oldStage.daysLimit ? ` (${oldStage.daysLimit})` : ""}` : lead?.stage || "";
    const newStageName = newStage ? `${newStage.title}${newStage.daysLimit ? ` (${newStage.daysLimit})` : ""}` : stage;
    const success = await updateLead(id, { stage, stage_entered_at: new Date().toISOString() } as any);
    if (success && lead) {
      const servidorId = lead.servidor_id;

      // Record card_history for SLA tracking
      if (workspaceId) {
        await supabase.from("card_history").insert({
          lead_id: id,
          workspace_id: workspaceId,
          from_column_id: lead.stage,
          to_column_id: stage,
          moved_by_user_id: profile?.user_id || null,
          moved_by_name: profile?.name || null,
        } as any);
      }

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

      // Check if moved to a final column in a Cadastro workspace → activate client
      if (workspaceId) {
        const { data: wsData } = await supabase
          .from("workspaces")
          .select("type")
          .eq("id", workspaceId)
          .maybeSingle();

        if (wsData?.type === "cadastro") {
          const { data: colData } = await supabase
            .from("kanban_columns")
            .select("is_final")
            .eq("id", stage)
            .maybeSingle();

          if (colData?.is_final) {
            await activateClientFromLead(lead);
          }
        }
      }
    }
    return success;
  };

  // Activate client in Base de Clientes when Cadastro is concluded
  const activateClientFromLead = async (lead: CrmLead) => {
    // Check for duplicate by CPF/email
    const documento = (lead as any).documento;
    if (documento) {
      const { data: existing } = await supabase
        .from("crm_client_registrations")
        .select("id, client_status")
        .eq("cpf", documento)
        .eq("client_status", "ativo")
        .neq("lead_id", lead.id)
        .limit(1);
      if (existing && existing.length > 0) {
        toast.warning("⚠️ Já existe um cliente ativo com esse CPF/CNPJ. Verifique antes de prosseguir.");
      }
    }

    // Update registration to active
    const { error: regErr } = await supabase
      .from("crm_client_registrations")
      .update({ client_status: "ativo", status: "aprovado", data_adesao: new Date().toISOString().split("T")[0] } as any)
      .eq("lead_id", lead.id);

    if (regErr) {
      captureAppError(regErr, { module: "crm_leads", action: "activate_client", tenantId: lead.servidor_id, metadata: { lead_id: lead.id } });
      toast.error("Erro ao ativar cliente na Base de Clientes");
      return;
    }


    // Log activity
    await supabase.from("crm_lead_activities").insert({
      lead_id: lead.id,
      servidor_id: lead.servidor_id,
      type: "won",
      title: "Cadastro concluído — Cliente ativado na Base de Clientes",
      description: `O cadastro foi conferido e aprovado. Cliente **${lead.contact_name || lead.company_name}** agora está ativo na Base de Clientes.`,
      created_by_user_id: profile?.user_id || null,
      created_by_name: profile?.name || null,
    } as any);

    toast.success("✅ Cliente ativado na Base de Clientes com sucesso!");
  };


  // Mark as WON — destination depends on workspace config
  const markAsWonAndTransfer = async (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return false;

    const dest = await resolveWonDestination(
      { id: lead.id, servidor_id: lead.servidor_id, workspace_id: lead.workspace_id },
      profile?.user_id,
    );
    if (!dest) {
      toast.error("Erro ao resolver destino do card ao marcar como Ganho");
      return false;
    }

    const previousStage = lead.stage;
    const originWorkspaceId = lead.workspace_id;

    // For 'base_clientes' we keep the current workspace/stage; otherwise we move.
    const updatePayload: any = {
      lead_status: "won",
      stage_entered_at: new Date().toISOString(),
      origin_workspace_id: originWorkspaceId,
      origin_stage: previousStage,
    };
    if (dest.kind !== "base_clientes") {
      updatePayload.stage = dest.firstColumnId;
      updatePayload.workspace_id = dest.workspaceId;
    }

    const success = await updateLead(id, updatePayload);

    if (success) {
      const activityTitle =
        dest.kind === "base_clientes"
          ? "Oportunidade ganha! Enviada para a Base de Clientes."
          : `Oportunidade ganha! Transferida para ${dest.label}.`;
      const activityDesc =
        dest.kind === "base_clientes"
          ? `Lead marcado como ganho e enviado diretamente para a **Base de Clientes**. Etapa anterior: **${previousStage}**.`
          : `Lead marcado como ganho e transferido para o workspace **${dest.label}**. Etapa anterior: **${previousStage}**.`;

      await supabase.from("crm_lead_activities").insert({
        lead_id: id,
        servidor_id: lead.servidor_id,
        type: "won",
        title: activityTitle,
        description: activityDesc,
        created_by_user_id: profile?.user_id || null,
        created_by_name: profile?.name || null,
        metadata: { previous_stage: previousStage, destination_kind: dest.kind },
      } as any);


      // Build the registration payload (used for insert AND for MERGE updates)
      const planoContratado = lead.notes?.includes("Plano:") ? lead.notes.split("Plano:")[1]?.trim().split("\n")[0] : null;
      const regPayload: Record<string, any> = {
        lead_id: id,
        servidor_id: lead.servidor_id,
        nome_completo: lead.contact_name || lead.company_name || "",
        email: lead.email || "",
        cpf: (lead as any).documento || null,
        cep: (lead as any).cep || null,
        endereco: (lead as any).endereco || null,
        numero: (lead as any).numero || null,
        bairro: (lead as any).bairro || null,
        cidade: lead.cidade || null,
        estado: lead.estado || null,
        created_by_user_id: profile?.user_id || null,
        created_by_name: profile?.name || null,
        plano_contratado: planoContratado,
        valor_mensal: lead.value_mrr || 0,
      };
      // For 'base_clientes', activate the client immediately
      if (dest.kind === "base_clientes") {
        regPayload.client_status = "ativo";
        regPayload.status = "concluido";
        regPayload.data_adesao = new Date().toISOString().split("T")[0];
      }

      // MERGE: if a registration already exists for this lead, update only
      // fields that are currently empty; otherwise insert.
      const { data: existingReg } = await supabase
        .from("crm_client_registrations" as any)
        .select("*")
        .eq("lead_id", id)
        .maybeSingle();

      let regId: string | null = null;
      if (existingReg) {
        regId = (existingReg as any).id;
        const merged: Record<string, any> = {};
        for (const [k, v] of Object.entries(regPayload)) {
          const cur = (existingReg as any)[k];
          const curEmpty = cur === null || cur === undefined || cur === "";
          const newHas = v !== null && v !== undefined && v !== "";
          if (curEmpty && newHas) merged[k] = v;
        }
        // Destination-driven status is authoritative for base_clientes
        if (dest.kind === "base_clientes") {
          merged.client_status = "ativo";
          merged.status = "concluido";
          if (!(existingReg as any).data_adesao) merged.data_adesao = regPayload.data_adesao;
        }
        if (Object.keys(merged).length > 0) {
          await supabase.from("crm_client_registrations" as any).update(merged).eq("id", regId);
        }
      } else {
        const regResult = await supabase.from("crm_client_registrations" as any).insert(regPayload).select("id").single();
        regId = (regResult.data as any)?.id ?? null;
      }

      if (regId) {
        const contractResult = await supabase.from("client_contracts").insert({
          registration_id: regId,
          servidor_id: lead.servidor_id,
          lead_id: id,
          client_name: lead.contact_name || lead.company_name || "",
          client_cpf: (lead as any).documento || "",
          plan_name: planoContratado || "Plano Padrão",
          monthly_value: lead.value_mrr || 0,
          created_by_user_id: profile?.user_id || null,
          created_by_name: profile?.name || null,
        } as any).select("id").single();
        const contractId = (contractResult.data as any)?.id;

        if (lead.value_mrr > 0) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 1);
          dueDate.setDate(10);

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

        if (contractId) {
          await supabase.from("client_contract_history").insert({
            contract_id: contractId,
            action: "Contrato criado automaticamente",
            description: `Contrato gerado automaticamente a partir da venda CRM. Vendedor: ${profile?.name || "Sistema"}. Valor: R$ ${(lead.value_mrr || 0).toFixed(2)}/mês`,
            created_by_name: profile?.name || "Sistema",
          } as any);
        }
      }

      // Notify admin users (only for cadastro/workspace flows; base_clientes is already active)
      if (dest.kind !== "base_clientes") {
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
                _message: `A oportunidade "${lead.company_name}" foi marcada como ganha e aguarda conferência no workspace ${dest.label}. Contrato e cobrança foram gerados automaticamente.`,
                _type: "cadastro_pendente",
              });
            }
          }
        }
      }

      // Toast per destination
      if (dest.kind === "base_clientes") {
        toast.success("🎉 Oportunidade ganha! Cliente enviado direto para a Base de Clientes.");
      } else {
        toast.success(`🎉 Oportunidade ganha! Card transferido para ${dest.label}. Contrato e cobrança gerados automaticamente.`);
      }



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
