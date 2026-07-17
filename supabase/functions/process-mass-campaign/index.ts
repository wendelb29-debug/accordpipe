// process-mass-campaign
// Processes a mass campaign (mass_campaigns + mass_campaign_recipients).
// Sends WhatsApp via the tenant's active integration (uazapi/zapi) and
// keeps the campaign's `status` and `totals` in sync so the UI can reflect
// "running" → "completed"/"failed" without manual refresh.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const normalizePhone = (p: string) => (p || "").replace(/\D/g, "");

function substituteVars(text: string, vars: Record<string, unknown>): string {
  if (!text) return text;
  return text
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => (vars?.[k] != null ? String(vars[k]) : ""))
    .replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_, k) => (vars?.[k] != null ? String(vars[k]) : ""));
}

function speedToDelay(speed: string): [number, number] {
  switch (speed) {
    case "fast": return [1500, 4000];
    case "slow": return [15000, 30000];
    case "manual":
    case "medium":
    default: return [6000, 15000];
  }
}

interface SendResult { success: boolean; message: string; external_id?: string; }

async function sendUazapi(serverUrl: string, token: string, phone: string, text: string, media: any): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  try {
    let url = `${base}/send/text`;
    let payload: Record<string, unknown> = { number: normalizePhone(phone), text };
    if (media?.url) {
      url = `${base}/send/media`;
      payload = {
        number: normalizePhone(phone),
        type: media.type || "image",
        file: media.url,
        text: text || undefined,
        docName: media.type === "document" ? media.filename : undefined,
      };
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { token, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    let body: any = {};
    try { body = JSON.parse(raw); } catch { body = { raw }; }
    if (!res.ok) return { success: false, message: `Uazapi HTTP ${res.status}: ${raw.slice(0, 250)}` };
    return { success: true, message: "ok", external_id: body?.key?.id || body?.id || body?.messageId };
  } catch (e) {
    return { success: false, message: `Uazapi err: ${(e as Error).message}` };
  }
}

async function sendZapi(serverUrl: string, instanceId: string, token: string, clientToken: string | null, phone: string, text: string): Promise<SendResult> {
  const base = serverUrl.replace(/\/$/, "");
  const url = `${base}/instances/${instanceId}/token/${token}/send-text`;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (clientToken) headers["Client-Token"] = clientToken;
    const res = await fetch(url, {
      method: "POST", headers,
      body: JSON.stringify({ phone: normalizePhone(phone), message: text }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: `Z-API HTTP ${res.status}` };
    return { success: true, message: "ok", external_id: (body as any)?.messageId };
  } catch (e) {
    return { success: false, message: `Z-API err: ${(e as Error).message}` };
  }
}

async function sendEmail(campaign: any, to: string, subject: string, body: string): Promise<SendResult> {
  try {
    const html = /<[a-z][\s\S]*>/i.test(body) ? body : `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${body.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>`;
    const textAlt = body.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "").replace(/\s+\n/g, "\n").trim();
    // Cabeçalhos de entregabilidade — mass campaign é sempre broadcast, então
    // sempre acompanha List-Unsubscribe (RFC 2369/8058).
    const unsubUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle-email-unsubscribe?email=${encodeURIComponent(to)}&campaign=${encodeURIComponent(campaign.id)}`;
    const headers = {
      "List-Unsubscribe": `<${unsubUrl}>, <mailto:unsubscribe@accordpipe.com.br?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "X-Campaign-Id": String(campaign.id),
      "X-Campaign-Type": "mass",
    };
    const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      },
      body: JSON.stringify({
        accountId: campaign.channel_ref,
        to,
        subject: subject || "(sem assunto)",
        html,
        text: textAlt,
        headers,
        disableOpenTracking: true,
      }),
    });
    const raw = await resp.text();
    if (!resp.ok) return { success: false, message: `Email HTTP ${resp.status}: ${raw.slice(0, 250)}` };
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch {}
    return { success: true, message: "ok", external_id: parsed?.messageId || parsed?.id };
  } catch (e) {
    return { success: false, message: `Email err: ${(e as Error).message}` };
  }
}

async function processCampaign(admin: any, campaign_id: string) {
  const { data: campaign } = await admin.from("mass_campaigns").select("*").eq("id", campaign_id).single();
  if (!campaign) return;

  const setTotals = async (patch: Record<string, unknown>, extra: Record<string, unknown> = {}) => {
    await admin.from("mass_campaigns").update({ totals: patch, ...extra }).eq("id", campaign_id);
  };

  try {
    await admin.from("mass_campaigns").update({ status: "running", last_dispatch_at: new Date().toISOString() }).eq("id", campaign_id);

    if (campaign.channel !== "whatsapp" && campaign.channel !== "email") {
      await admin.from("mass_campaigns").update({
        status: "failed",
        totals: { ...(campaign.totals || {}), error: "Canal não suportado ainda" },
      }).eq("id", campaign_id);
      return;
    }

    // Resolve WhatsApp integration (only for WhatsApp campaigns)
    let integ: any = null;
    let clientToken: string | null = null;
    if (campaign.channel === "whatsapp") {
      const { data: found } = await admin
        .from("tenant_whatsapp_integrations")
        .select("*")
        .eq("tenant_id", campaign.tenant_id)
        .order("is_active", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      integ = found;
      if (!integ || !integ.server_url || !integ.instance_token) {
        await admin.from("mass_campaigns").update({
          status: "failed",
          totals: { ...(campaign.totals || {}), error: "Integração de WhatsApp não configurada" },
        }).eq("id", campaign_id);
        return;
      }
      if (integ.provider_type === "zapi") {
        const { data: comp } = await admin.from("companies").select("zapi_client_token").eq("id", campaign.tenant_id).maybeSingle();
        clientToken = comp?.zapi_client_token ?? null;
      }
    } else if (campaign.channel === "email") {
      if (!campaign.channel_ref) {
        await admin.from("mass_campaigns").update({
          status: "failed",
          totals: { ...(campaign.totals || {}), error: "Conta de e-mail não configurada" },
        }).eq("id", campaign_id);
        return;
      }
      const { data: acc } = await admin.from("email_accounts").select("id, status, provider").eq("id", campaign.channel_ref).maybeSingle();
      if (!acc) {
        await admin.from("mass_campaigns").update({
          status: "failed",
          totals: { ...(campaign.totals || {}), error: "Conta de e-mail não encontrada" },
        }).eq("id", campaign_id);
        return;
      }
    }

    const { data: recipients } = await admin
      .from("mass_campaign_recipients")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending")
      .order("created_at");

    const list = recipients || [];
    const total = list.length;
    let sent = 0, failed = 0;
    const [minMs, maxMs] = speedToDelay(campaign.speed);
    const media = campaign.variable_mapping?.media || null;

    for (let i = 0; i < list.length; i++) {
      // pause/cancel check
      const { data: live } = await admin.from("mass_campaigns").select("status").eq("id", campaign_id).single();
      if (live?.status === "paused" || live?.status === "canceled") break;

      const r = list[i];
      const vars = { ...(r.variables || {}), nome: r.name || r.variables?.nome || "", telefone: r.contact, email: r.contact };
      const text = substituteVars(campaign.body || "", vars);
      const subject = substituteVars(campaign.subject || "", vars);

      let result: SendResult;
      if (campaign.channel === "email") {
        const email = (r.contact || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          await admin.from("mass_campaign_recipients").update({ status: "failed", error: "E-mail inválido" }).eq("id", r.id);
          failed++;
          if ((i + 1) % 5 === 0 || i === list.length - 1) {
            await setTotals({ queued: total - sent - failed, sent, failed, replied: 0 });
          }
          continue;
        }
        // Suppression check (tenant-scoped or global)
        const { data: suppressed } = await admin
          .from("email_suppression_list")
          .select("id, reason")
          .or(`tenant_id.eq.${campaign.tenant_id},tenant_id.is.null`)
          .ilike("email", email)
          .limit(1)
          .maybeSingle();
        if (suppressed) {
          await admin.from("mass_campaign_recipients").update({
            status: "failed",
            error: `Suprimido (${suppressed.reason})`,
          }).eq("id", r.id);
          failed++;
          if ((i + 1) % 5 === 0 || i === list.length - 1) {
            await setTotals({ queued: total - sent - failed, sent, failed, replied: 0 });
          }
          continue;
        }
        result = await sendEmail(campaign, email, subject, text);
      } else {
        const phone = normalizePhone(r.contact);
        if (!phone || phone.length < 10) {
          await admin.from("mass_campaign_recipients").update({ status: "failed", error: "Telefone inválido" }).eq("id", r.id);
          failed++;
          if ((i + 1) % 5 === 0 || i === list.length - 1) {
            await setTotals({ queued: total - sent - failed, sent, failed, replied: 0 });
          }
          continue;
        }
        if (integ.provider_type === "uazapi") {
          result = await sendUazapi(integ.server_url, integ.instance_token, phone, text, media);
        } else if (integ.provider_type === "zapi") {
          result = await sendZapi(integ.server_url, integ.instance_id, integ.instance_token, clientToken, phone, text);
        } else {
          result = { success: false, message: `Provider ${integ.provider_type} não suportado` };
        }
      }

      if (result.success) {
        await admin.from("mass_campaign_recipients").update({
          status: "sent", sent_at: new Date().toISOString(), error: null,
        }).eq("id", r.id);
        sent++;
      } else {
        await admin.from("mass_campaign_recipients").update({
          status: "failed", error: result.message.slice(0, 500),
        }).eq("id", r.id);
        failed++;
      }

      // Flush totals every 5 or on last
      if ((i + 1) % 5 === 0 || i === list.length - 1) {
        await setTotals({ queued: total - sent - failed, sent, failed, replied: 0 });
      }

      if (i < list.length - 1) {
        const delay = minMs + Math.random() * (maxMs - minMs);
        await sleep(delay);
      }
    }

    const { data: finalLive } = await admin.from("mass_campaigns").select("status").eq("id", campaign_id).single();
    if (finalLive?.status !== "paused" && finalLive?.status !== "canceled") {
      await admin.from("mass_campaigns").update({
        status: sent === 0 && failed > 0 ? "failed" : "completed",
        totals: { queued: 0, sent, failed, replied: 0 },
      }).eq("id", campaign_id);
    }
  } catch (err: any) {
    console.error("process-mass-campaign error:", err);
    await admin.from("mass_campaigns").update({
      status: "failed",
      totals: { ...(campaign.totals || {}), error: String(err?.message || err) },
    }).eq("id", campaign_id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) return json({ error: "campaign_id obrigatório" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(processCampaign(admin, campaign_id));

    return json({ ok: true, accepted: true, campaign_id }, 202);
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
