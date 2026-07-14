import { supabase } from "@/integrations/supabase/client";

/**
 * Move a CRM lead to a new kanban stage/column, mirroring the behavior of
 * useCrmLeads.moveToStage: updates crm_leads.stage + stage_entered_at, records
 * card_history for SLA tracking, and appends a stage_change activity.
 *
 * Intentionally minimal (no toast) so callers can decide UX.
 */
export async function moveLeadStage(params: {
  leadId: string;
  servidorId: string;
  workspaceId: string;
  fromStage: string | null;
  toStage: string;
  fromStageName?: string;
  toStageName?: string;
  actor?: { user_id?: string | null; name?: string | null } | null;
}): Promise<{ ok: boolean; error?: string }> {
  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("crm_leads")
    .update({ stage: params.toStage, stage_entered_at: nowIso } as any)
    .eq("id", params.leadId);
  if (upErr) return { ok: false, error: upErr.message };

  await supabase.from("card_history").insert({
    lead_id: params.leadId,
    workspace_id: params.workspaceId,
    from_column_id: params.fromStage,
    to_column_id: params.toStage,
    moved_by_user_id: params.actor?.user_id || null,
    moved_by_name: params.actor?.name || null,
  } as any);

  await supabase.from("crm_lead_activities").insert({
    lead_id: params.leadId,
    servidor_id: params.servidorId,
    type: "stage_change",
    title: "Mudou de etapa",
    description: `Esta oportunidade passou da etapa **${params.fromStageName || params.fromStage || "-"}** para a etapa **${params.toStageName || params.toStage}**.`,
    created_by_user_id: params.actor?.user_id || null,
    created_by_name: params.actor?.name || null,
  } as any);

  return { ok: true };
}
