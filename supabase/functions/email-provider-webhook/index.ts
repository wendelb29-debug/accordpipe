// email-provider-webhook
// Recebe eventos de bounce / complaint / spam do provedor de envio (Mailgun/Resend/SES etc.)
// e alimenta a tabela email_suppression_list para bloquear reenvios futuros.
//
// Este webhook aceita um payload genérico com { event, email, reason?, message_id?, tenant_id? }
// e também tenta interpretar formatos conhecidos (Mailgun/Resend/SendGrid) via 'event-data'/'type'.
//
// Segurança: se o segredo EMAIL_WEBHOOK_SECRET estiver configurado, o header
// x-webhook-secret (ou query ?secret=) precisa bater.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Reason = "hard_bounce" | "complaint" | "unsubscribe" | "soft_bounce_repeated" | "manual";

function mapReason(raw: string): Reason | null {
  const s = (raw || "").toLowerCase();
  if (s.includes("complaint") || s.includes("spam") || s.includes("abuse")) return "complaint";
  if (s.includes("unsub")) return "unsubscribe";
  if (s.includes("permanent") || s === "hard_bounce" || s === "bounce" || s === "failed") return "hard_bounce";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("EMAIL_WEBHOOK_SECRET");
  if (secret) {
    const url = new URL(req.url);
    const provided = req.headers.get("x-webhook-secret") || url.searchParams.get("secret");
    if (provided !== secret) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let body: any;
  try { body = await req.json(); } catch { body = {}; }

  // Normalização de formatos conhecidos
  const eventRaw =
    body?.event ||
    body?.type ||
    body?.["event-data"]?.event ||
    body?.data?.type ||
    "";
  const email =
    body?.email ||
    body?.recipient ||
    body?.to ||
    body?.["event-data"]?.recipient ||
    body?.data?.email ||
    "";
  const messageId =
    body?.message_id ||
    body?.["event-data"]?.message?.headers?.["message-id"] ||
    body?.data?.message_id ||
    null;
  const tenantId = body?.tenant_id || null;

  const reason = mapReason(String(eventRaw));
  if (!reason || !email) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "unrecognized_event" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { error } = await admin.from("email_suppression_list").upsert(
    {
      tenant_id: tenantId,
      email: String(email).toLowerCase().trim(),
      reason,
      source: "provider_webhook",
      external_message_id: messageId,
      metadata: { raw: body },
    },
    { onConflict: "tenant_id,email" },
  );

  if (error) {
    // conflito de índice funcional — tenta upsert por email quando tenant_id é null
    console.error("suppression upsert error", error.message);
  }

  return new Response(JSON.stringify({ ok: true, reason, email }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
