// Shared helper to insert a CRM lead from any inbound source (ads webhook, etc.)
// Mirrors the logic in lead-form-webhook but is reusable across edge functions.
// NEVER modify lead-form-webhook — use this helper from new functions instead.

// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CrmLeadInsertInput {
  servidor_id: string;
  workspace_id?: string | null;
  stage?: string | null;
  source: string;
  contact_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  cidade?: string | null;
  tags?: string[];
  extra?: Record<string, any>;
}

export interface CrmLeadInsertResult {
  lead_id: string | null;
  error?: string;
}

export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function insertCrmLead(
  admin: SupabaseClient,
  input: CrmLeadInsertInput,
): Promise<CrmLeadInsertResult> {
  try {
    let { servidor_id, workspace_id, stage } = input;
    if (!servidor_id) return { lead_id: null, error: "missing servidor_id" };

    // Validate workspace belongs to tenant
    if (workspace_id) {
      const { data: ws } = await admin
        .from("workspaces")
        .select("id, servidor_id")
        .eq("id", workspace_id)
        .maybeSingle();
      if (!ws || ws.servidor_id !== servidor_id) {
        console.warn("[crmLeadInsert] workspace/tenant mismatch — clearing", { workspace_id, servidor_id });
        workspace_id = null;
      }
    }

    // Resolve initial stage: first kanban column when workspace is set
    let initialStage = stage || "novos";
    if (workspace_id && !stage) {
      const { data: firstCol } = await admin
        .from("kanban_columns")
        .select("id, position, name")
        .eq("workspace_id", workspace_id)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstCol?.id) initialStage = firstCol.id;
    }

    // Build notes from extra
    const noteParts: string[] = [];
    if (input.extra) {
      for (const [k, v] of Object.entries(input.extra)) {
        if (v == null || v === "") continue;
        noteParts.push(`${k}: ${String(v).substring(0, 500)}`);
      }
    }
    const notes = noteParts.length > 0 ? noteParts.join("\n") : null;

    const contact = (input.contact_name || "").trim().substring(0, 200) || "Lead sem nome";
    const company = (input.company_name || contact).trim().substring(0, 200);

    const { data: lead, error } = await admin
      .from("crm_leads")
      .insert({
        servidor_id,
        source: (input.source || "Ads").substring(0, 100),
        contact_name: contact,
        company_name: company,
        email: input.email ? String(input.email).trim().substring(0, 255) : null,
        phone: input.phone ? String(input.phone).trim().substring(0, 30) : null,
        cidade: input.cidade ? String(input.cidade).trim().substring(0, 100) : null,
        notes,
        tags: input.tags && input.tags.length > 0 ? input.tags : ["ads"],
        stage: initialStage,
        created_by_name: contact,
        workspace_id: workspace_id || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[crmLeadInsert] insert error", error);
      return { lead_id: null, error: error.message };
    }
    return { lead_id: lead.id };
  } catch (e: any) {
    console.error("[crmLeadInsert] unexpected", e);
    return { lead_id: null, error: e?.message || "unknown" };
  }
}
