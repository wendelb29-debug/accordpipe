// process-whatsapp-campaign
// Processes a marketing campaign by sending personalized WhatsApp messages
// through the tenant's active WhatsApp integration (uazapi or zapi).
// Mirrors the structure of process-marketing-campaign so the frontend can
// subscribe to marketing_campaign_recipients via Supabase Realtime.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function substituteVars(text: string, vars: Record<string, unknown>): string {
  if (!text) return text;
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = vars?.[key];
    return v !== null && v !== undefined ? String(v) : "";
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function randomDelayMs(minMs: number, maxMs: number) {
  const lo = Math.max(0, minMs || 0);
  const hi = Math.max(lo, maxMs || lo);
  return lo + Math.random() * (hi - lo);
}

// ---------- WhatsApp helpers (mirrored from whatsapp-send) ----------
interface SendResult {
  success: boolean;
  message: string;
  external_id?: string;
  raw?: unknown;
}

function normalizePhone(p: string): string {
  return (p || "").replace(/\D/g, "");
}

async function sendUazapi(
  serverUrl: string,
  instanceName: string,
  instanceToken: string,
  phone: string,
  text: string,
): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/send/text`;
  const payload: Record<string, unknown> = { number: normalizePhone(phone), text };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { token: instanceToken, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const rawText = await res.text();
    let body: any = {};
    try { body = JSON.parse(rawText); } catch { body = { raw: rawText }; }

    if (!res.ok) {
      return {
        success: false,
        message: `Uazapi HTTP ${res.status}: ${rawText.slice(0, 250) || "(sem corpo)"}`,
        raw: body,
      };
    }
    const externalId =
      body?.key?.id || body?.id || body?.messageId || body?.message?.id || undefined;
    return { success: true, message: "Mensagem enviada via Uazapi", external_id: externalId, raw: body };
  } catch (err) {
    return { success: false, message: `Falha Uazapi: ${(err as Error).message}` };
  }
}

async function sendZapi(
  serverUrl: string,
  instanceId: string,
  token: string,
  clientToken: string | null,
  phone: string,
  text: string,
): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/instances/${instanceId}/token/${token}/send-text`;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (clientToken) headers["Client-Token"] = clientToken;
    const payload: Record<string, unknown> = { phone: normalizePhone(phone), message: text };
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, message: `Z-API HTTP ${res.status}`, raw: body };
    }
    return { success: true, message: "Mensagem enviada via Z-API", external_id: (body as any)?.messageId, raw: body };
  } catch (err) {
    return { success: false, message: `Falha Z-API: ${(err as Error).message}` };
  }
}

// ---------- Main ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error("campaign_id obrigatório");

    const { data: campaign, error: cErr } = await admin
      .from("marketing_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (cErr || !campaign) throw new Error("Campanha não encontrada");
    if (campaign.channel !== "whatsapp") throw new Error("Apenas campanhas de WhatsApp são processadas aqui");

    // Resolve the tenant's active WhatsApp integration (same pattern as whatsapp-send)
    const { data: integ } = await admin
      .from("tenant_whatsapp_integrations")
      .select("*")
      .eq("tenant_id", campaign.servidor_id)
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!integ || !integ.server_url || !integ.instance_token) {
      await admin
        .from("marketing_campaigns")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", campaign_id);
      throw new Error("Integração de WhatsApp ativa não encontrada para este tenant (server_url/instance_token ausentes)");
    }

    // For Z-API we also need the tenant's client-token
    let clientToken: string | null = null;
    if (integ.provider_type === "zapi") {
      const { data: comp } = await admin
        .from("companies")
        .select("zapi_client_token")
        .eq("id", campaign.servidor_id)
        .maybeSingle();
      clientToken = comp?.zapi_client_token ?? null;
    }

    await admin
      .from("marketing_campaigns")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", campaign_id);

    const minMs = campaign.throttle_min_ms ?? 8000;
    const maxMs = campaign.throttle_max_ms ?? 25000;

    const { data: recipients } = await admin
      .from("marketing_campaign_recipients")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending")
      .order("created_at");

    let sent = 0;
    let failed = 0;
    let aborted = false;

    for (let i = 0; i < (recipients?.length || 0); i++) {
      // Pause/cancel check before each send
      const { data: live } = await admin
        .from("marketing_campaigns")
        .select("status")
        .eq("id", campaign_id)
        .single();
      if (live?.status === "paused" || live?.status === "cancelled") {
        aborted = true;
        break;
      }

      const r = recipients![i];
      const normalized = normalizePhone(r.contact);

      if (!normalized || normalized.length < 10) {
        await admin
          .from("marketing_campaign_recipients")
          .update({ status: "failed", error_message: "Telefone inválido" })
          .eq("id", r.id);
        failed++;
        continue;
      }

      const vars = {
        ...(r.variables || {}),
        nome: r.name || r.variables?.nome || "",
        telefone: r.contact,
      };
      const mensagem = substituteVars(campaign.body || "", vars);

      try {
        let result: SendResult;
        if (integ.provider_type === "uazapi") {
          result = await sendUazapi(
            integ.server_url,
            integ.instance_name || integ.instance_id,
            integ.instance_token,
            normalized,
            mensagem,
          );
        } else if (integ.provider_type === "zapi") {
          result = await sendZapi(
            integ.server_url,
            integ.instance_id,
            integ.instance_token,
            clientToken,
            normalized,
            mensagem,
          );
        } else {
          result = {
            success: false,
            message: `Provider ${integ.provider_type} ainda não suportado no envio em massa`,
          };
        }

        if (result.success) {
          await admin
            .from("marketing_campaign_recipients")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              provider_message_id: result.external_id ?? null,
              error_message: null,
            })
            .eq("id", r.id);
          sent++;
        } else {
          await admin
            .from("marketing_campaign_recipients")
            .update({
              status: "failed",
              error_message: (result.message || "Falha ao enviar").slice(0, 500),
            })
            .eq("id", r.id);
          failed++;
        }
      } catch (err: any) {
        const reason = (err?.message || String(err)).slice(0, 500);
        await admin
          .from("marketing_campaign_recipients")
          .update({ status: "failed", error_message: reason })
          .eq("id", r.id);
        failed++;
      }

      // Periodically update aggregate counters so the campaign card stays fresh
      if ((i + 1) % 10 === 0 || i === (recipients!.length - 1)) {
        await admin
          .from("marketing_campaigns")
          .update({ sent_count: sent, failed_count: failed })
          .eq("id", campaign_id);
      }

      if (i < recipients!.length - 1) {
        await sleep(randomDelayMs(minMs, maxMs));
      }
    }

    if (!aborted) {
      await admin
        .from("marketing_campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          sent_count: sent,
          failed_count: failed,
        })
        .eq("id", campaign_id);
    } else {
      // Flush counters on pause/cancel without flipping status
      await admin
        .from("marketing_campaigns")
        .update({ sent_count: sent, failed_count: failed })
        .eq("id", campaign_id);
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, aborted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[process-whatsapp-campaign] ERRO:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
