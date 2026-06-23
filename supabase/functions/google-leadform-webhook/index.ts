// Google Ads Lead Form webhook — receives leads from Google Ads "Lead form extension"
// Public endpoint (verify_jwt = false). Always responds 200 to prevent retries spam.

// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient, insertCrmLead } from "../_shared/crmLeadInsert.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ok = (body: Record<string, any> = { status: "ok" }, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface GoogleColumn {
  column_id?: string;
  string_value?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return ok({ status: "ignored" });

  const admin = getAdminClient();
  let payload: any = null;

  try {
    payload = await req.json();
  } catch {
    return ok({ status: "invalid_json" });
  }

  const lead_id: string | undefined = payload?.lead_id;
  const form_id: string | undefined = payload?.form_id;
  const campaign_id: string | undefined = payload?.campaign_id;
  const google_key: string | undefined = payload?.google_key;
  const userColumns: GoogleColumn[] = Array.isArray(payload?.user_column_data)
    ? payload.user_column_data
    : [];

  if (!google_key) {
    console.warn("[google-leadform-webhook] missing google_key");
    return ok({ status: "ignored" });
  }

  try {
    // Look up the configured form by webhook key
    const { data: adForm } = await admin
      .from("ad_lead_forms")
      .select("id, servidor_id, workspace_id, stage, tags, external_form_id, campaign_id, lead_count")
      .eq("google_webhook_key", google_key)
      .eq("is_active", true)
      .eq("provider", "google")
      .maybeSingle();

    if (!adForm) {
      console.warn("[google-leadform-webhook] no active ad_lead_forms for key");
      return ok({ status: "ignored" });
    }

    // Dedup check
    if (lead_id) {
      const { data: existing } = await admin
        .from("ad_lead_events")
        .select("id")
        .eq("provider", "google")
        .eq("external_lead_id", lead_id)
        .maybeSingle();
      if (existing) {
        return ok({ status: "duplicate" });
      }
    }

    // Map columns
    let contact_name = "";
    let email: string | null = null;
    let phone: string | null = null;
    let company_name: string | null = null;
    let cidade: string | null = null;
    const extra: Record<string, any> = {};
    if (campaign_id) extra.campaign_id = campaign_id;
    if (form_id) extra.form_id = form_id;

    for (const col of userColumns) {
      const id = (col.column_id || "").toUpperCase();
      const val = (col.string_value || "").trim();
      if (!val) continue;
      switch (id) {
        case "FULL_NAME":
        case "NOME":
          contact_name = val;
          break;
        case "EMAIL":
          email = val;
          break;
        case "PHONE_NUMBER":
        case "TELEFONE":
          phone = val;
          break;
        case "COMPANY_NAME":
          company_name = val;
          break;
        case "CITY":
        case "CIDADE":
          cidade = val;
          break;
        default:
          extra[id || "campo"] = val;
      }
    }

    if (!contact_name) contact_name = company_name || email || phone || "Lead Google Ads";

    const tags = Array.from(new Set([...(adForm.tags || []), "google-ads"]));

    const { lead_id: crmLeadId, error: insertErr } = await insertCrmLead(admin, {
      servidor_id: adForm.servidor_id,
      workspace_id: adForm.workspace_id,
      stage: adForm.stage || null,
      source: "Google Ads",
      contact_name,
      company_name,
      email,
      phone,
      cidade,
      tags,
      extra,
    });

    // Log event
    await admin.from("ad_lead_events").insert({
      servidor_id: adForm.servidor_id,
      provider: "google",
      external_lead_id: lead_id || null,
      raw_payload: payload,
      processed: !insertErr,
      crm_lead_id: crmLeadId,
      error: insertErr || null,
    });

    // Update ad_lead_forms aggregates
    const updates: Record<string, any> = {
      last_lead_at: new Date().toISOString(),
      lead_count: (adForm.lead_count || 0) + 1,
    };
    if (!adForm.external_form_id && form_id) updates.external_form_id = form_id;
    if (!adForm.campaign_id && campaign_id) updates.campaign_id = campaign_id;
    await admin.from("ad_lead_forms").update(updates).eq("id", adForm.id);

    return ok({ status: insertErr ? "error_logged" : "ok", lead_id: crmLeadId });
  } catch (e: any) {
    console.error("[google-leadform-webhook] unexpected", e);
    try {
      await admin.from("ad_lead_events").insert({
        provider: "google",
        external_lead_id: lead_id || null,
        raw_payload: payload,
        processed: false,
        error: e?.message || "unknown",
      });
    } catch (_) { /* ignore */ }
    return ok({ status: "error_logged" });
  }
});
