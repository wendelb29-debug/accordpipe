import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Tables that reference a tenant by column name. Order is irrelevant — service_role bypasses FKs
// only via cascade; we run them in a safe order putting children before parents.
const TENANT_TABLES: Array<[string, string]> = [
  // tenant_id
  ["push_subscriptions", "tenant_id"],
  ["academy_progress", "tenant_id"],
  ["academy_courses", "tenant_id"],
  ["academy_categories", "tenant_id"],
  ["performance_ai_plans", "tenant_id"],
  ["performance_feedbacks", "tenant_id"],
  ["performance_goals", "tenant_id"],
  ["performance_hierarchy", "tenant_id"],
  ["performance_snapshots", "tenant_id"],
  ["performance_teams", "tenant_id"],
  ["operator_status", "tenant_id"],
  ["user_goals", "tenant_id"],
  ["workspace_kpis", "tenant_id"],
  ["workspace_goals", "tenant_id"],
  ["workspace_goal_models", "tenant_id"],
  ["user_workspace_permissions", "tenant_id"],
  ["tenant_events", "tenant_id"],
  ["tenant_asaas_webhook_events", "tenant_id"],
  ["tenant_asaas_payments", "tenant_id"],
  ["tenant_asaas_subscriptions", "tenant_id"],
  ["tenant_asaas_customers", "tenant_id"],
  ["tenant_fintech_integrations", "tenant_id"],
  ["tenant_whatsapp_integrations", "tenant_id"],
  ["tenant_invoices", "tenant_id"],
  ["tenant_subscription_history", "tenant_id"],
  ["subscription_extras", "tenant_id"],
  ["tenant_subscriptions", "tenant_id"],
  ["paddle_subscriptions", "tenant_id"],
  ["master_billing_history", "tenant_id"],
  ["master_tenant_clients", "tenant_id"],
  ["system_error_logs", "tenant_id"],
  ["user_tenants", "tenant_id"],

  // servidor_id
  ["crm_lead_activities", "servidor_id"],
  ["crm_client_registrations", "servidor_id"],
  ["crm_leads", "servidor_id"],
  ["crm_tags", "servidor_id"],
  ["crm_forms", "servidor_id"],
  ["lead_documents", "servidor_id"],
  ["lead_post_sale", "servidor_id"],
  ["proposal_items", "servidor_id"],
  ["proposal_catalog_items", "servidor_id"],
  ["proposal_brands", "servidor_id"],
  ["proposals", "servidor_id"],
  ["pdf_contracts", "servidor_id"],
  ["client_upsells", "servidor_id"],
  ["client_contracts", "servidor_id"],
  ["generated_documents", "servidor_id"],
  ["document_templates", "servidor_id"],
  ["drive_files", "servidor_id"],
  ["financial_transactions", "servidor_id"],
  ["fintech_webhook_logs", "servidor_id"],
  ["fintech_integrations", "servidor_id"],
  ["tenant_financial_config", "servidor_id"],
  ["tenant_contract_sequences", "servidor_id"],
  ["integration_actions", "servidor_id"],
  ["announcements", "servidor_id"],
  ["audit_logs", "servidor_id"],
  ["notifications", "servidor_id"],
  ["workspace_groups", "servidor_id"],
  ["workspaces", "servidor_id"],

  // company_id
  ["whatsapp_messages", "company_id"],
  ["whatsapp_contacts", "company_id"],
  ["whatsapp_labels", "company_id"],
  ["whatsapp_sessions", "company_id"],
  ["whatsapp_routing_rules", "company_id"],
  ["whatsapp_automations", "company_id"],
  ["whatsapp_workspace_config", "company_id"],
  ["company_contract_templates", "company_id"],
  ["company_api_credentials", "company_id"],
  ["contracts", "company_id"],
  ["documents", "company_id"],
  ["payments", "company_id"],
  ["user_invitations", "company_id"],
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json(401, { ok: false, error: "Não autenticado" });
    }
    const actorId = userData.user.id;

    // Authorization: only is_master = true
    const { data: actorProfile } = await admin
      .from("profiles")
      .select("is_master, company_id, name, email")
      .eq("user_id", actorId)
      .maybeSingle();

    if (!actorProfile?.is_master) {
      return json(403, { ok: false, error: "Apenas o usuário Master pode excluir tenants." });
    }

    const { tenant_id } = await req.json();
    if (!tenant_id || typeof tenant_id !== "string") {
      return json(400, { ok: false, error: "tenant_id obrigatório" });
    }

    // Load tenant
    const { data: tenant } = await admin
      .from("companies")
      .select("id, razao_social, nome_fantasia, servidor_id")
      .eq("id", tenant_id)
      .maybeSingle();

    if (!tenant) {
      return json(404, { ok: false, error: "Tenant não encontrado." });
    }

    // Block deleting the Tenant Master itself
    if (tenant.servidor_id === null) {
      return json(400, { ok: false, error: "Não é permitido excluir o Tenant Master." });
    }

    // Block self-deletion of own tenant
    if (tenant_id === actorProfile.company_id) {
      return json(400, { ok: false, error: "Você não pode excluir o tenant ao qual pertence." });
    }

    const errors: Record<string, string> = {};

    for (const [table, col] of TENANT_TABLES) {
      const { error } = await admin.from(table).delete().eq(col, tenant_id);
      if (error) errors[table] = error.message;
    }

    // Detach profiles that belonged to this tenant (do not delete the user account)
    await admin
      .from("profiles")
      .update({ company_id: null })
      .eq("company_id", tenant_id);

    // Finally delete the tenant itself
    const { error: companyDelErr } = await admin
      .from("companies")
      .delete()
      .eq("id", tenant_id);

    if (companyDelErr) {
      return json(500, {
        ok: false,
        error: `Falha ao excluir tenant: ${companyDelErr.message}`,
        partial_errors: errors,
      });
    }

    await admin.from("audit_logs").insert({
      user_id: actorId,
      user_name: actorProfile.name || actorProfile.email || "system",
      action: "tenant_deleted_hard",
      target_type: "company",
      target_id: tenant_id,
      details: {
        tenant_name: tenant.nome_fantasia || tenant.razao_social,
        cleanup_errors: errors,
      },
    });

    return json(200, { ok: true, deleted_tenant_id: tenant_id, partial_errors: errors });
  } catch (e: any) {
    return json(500, { ok: false, error: e.message || String(e) });
  }
});
