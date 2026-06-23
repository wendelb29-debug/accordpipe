// Meta (Facebook) Lead Ads webhook
// GET: verification handshake using META_VERIFY_TOKEN
// POST: receives leadgen notifications, validates X-Hub-Signature-256, dedupes, and inserts CRM leads
import { createClient } from "npm:@supabase/supabase-js@2";
import { insertCrmLead } from "../_shared/crmLeadInsert.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN") ?? "";
const META_APP_SECRET = Deno.env.get("META_APP_SECRET") ?? "";

async function verifySignature(rawBody: string, header: string | null) {
  if (!META_APP_SECRET || !header) return false;
  const sig = header.startsWith("sha256=") ? header.slice(7) : header;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // constant-time compare
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ---- GET: Meta verification handshake ----
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (!META_VERIFY_TOKEN) {
      console.error("[meta-leadgen-webhook] META_VERIFY_TOKEN not configured");
      return new Response("verify token not configured", {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (mode === "subscribe" && token === META_VERIFY_TOKEN && challenge) {
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    console.warn("[meta-leadgen-webhook] verification failed", { mode, hasToken: !!token });
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  // ---- POST: leadgen notification ----
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const validSig = await verifySignature(rawBody, signature);
  if (!validSig) {
    console.warn("[meta-leadgen-webhook] invalid signature");
    return new Response("invalid signature", { status: 401, headers: corsHeaders });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("invalid json", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    for (const entry of payload.entry ?? []) {
      const pageId: string | undefined = entry.id;
      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue;
        const v = change.value ?? {};
        const leadgenId: string = v.leadgen_id;
        const formId: string = v.form_id;
        if (!leadgenId || !formId) continue;

        // Dedup
        const { data: existing } = await supabase
          .from("ad_lead_events")
          .select("id")
          .eq("provider", "meta")
          .eq("external_id", leadgenId)
          .maybeSingle();
        if (existing) continue;

        // Locate form -> integration -> tenant
        const { data: form } = await supabase
          .from("ad_lead_forms")
          .select("id, servidor_id, integration_id, destination_workspace_id, destination_stage_id, is_active")
          .eq("provider", "meta")
          .eq("provider_form_id", formId)
          .maybeSingle();

        if (!form) {
          await supabase.from("ad_lead_events").insert({
            provider: "meta",
            external_id: leadgenId,
            raw_payload: v,
            status: "ignored_unknown_form",
          });
          continue;
        }

        // Get page access token
        const { data: integ } = await supabase
          .from("ad_integrations")
          .select("page_access_token")
          .eq("id", form.integration_id)
          .maybeSingle();

        let leadData: Record<string, any> = {};
        try {
          if (integ?.page_access_token) {
            const r = await fetch(
              `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${integ.page_access_token}`,
            );
            if (r.ok) leadData = await r.json();
          }
        } catch (e) {
          console.warn("[meta-leadgen-webhook] failed to fetch lead detail", e);
        }

        const fields: Record<string, string> = {};
        for (const f of leadData.field_data ?? []) {
          fields[String(f.name).toLowerCase()] = Array.isArray(f.values) ? f.values[0] : "";
        }
        const name = fields["full_name"] || fields["name"] || "Lead Meta";
        const email = fields["email"] || null;
        const phone = fields["phone_number"] || fields["phone"] || null;

        let crmLeadId: string | null = null;
        if (form.is_active && form.destination_workspace_id) {
          try {
            crmLeadId = await insertCrmLead(supabase, {
              servidor_id: form.servidor_id,
              workspace_id: form.destination_workspace_id,
              stage_id: form.destination_stage_id ?? null,
              name,
              email,
              phone,
              source: "Meta Lead Ads",
              raw: fields,
            });
          } catch (e) {
            console.error("[meta-leadgen-webhook] insertCrmLead failed", e);
          }
        }

        await supabase.from("ad_lead_events").insert({
          provider: "meta",
          external_id: leadgenId,
          ad_lead_form_id: form.id,
          servidor_id: form.servidor_id,
          raw_payload: { notification: v, lead: leadData },
          status: crmLeadId ? "inserted" : "received",
          crm_lead_id: crmLeadId,
        });

        await supabase
          .from("ad_lead_forms")
          .update({
            last_lead_at: new Date().toISOString(),
            lead_count: ((form as any).lead_count ?? 0) + 1,
          })
          .eq("id", form.id);
      }
      void pageId;
    }
  } catch (e) {
    console.error("[meta-leadgen-webhook] processing error", e);
  }

  // Always 200 to ack Meta
  return new Response("ok", { status: 200, headers: corsHeaders });
});
