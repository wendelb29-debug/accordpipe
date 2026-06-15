// process-marketing-campaign
// Processes a marketing campaign by sending personalized emails through the
// Gmail or Outlook account stored in marketing_email_connections.
// Status is written back to marketing_campaign_recipients in real time so the
// frontend can subscribe via Supabase Realtime.

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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function randomDelayMs(minMs: number, maxMs: number) {
  const lo = Math.max(0, minMs || 0);
  const hi = Math.max(lo, maxMs || lo);
  return lo + Math.random() * (hi - lo);
}

// ---------- Gmail ----------
async function refreshGmailToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Gmail refresh failed: ${JSON.stringify(j)}`);
  return j as { access_token: string; expires_in?: number };
}

async function getGmailValidToken(admin: any, conn: any): Promise<string> {
  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  if (conn.access_token && expiresAt > Date.now() + 60_000) return conn.access_token;
  if (!conn.refresh_token) throw new Error("Conexão Gmail sem refresh_token");
  const r = await refreshGmailToken(conn.refresh_token);
  const newExpiresAt = new Date(Date.now() + (r.expires_in || 3600) * 1000).toISOString();
  await admin
    .from("marketing_email_connections")
    .update({ access_token: r.access_token, expires_at: newExpiresAt })
    .eq("id", conn.id);
  return r.access_token;
}

function buildRawEmail(from: string, fromName: string | null, to: string, subject: string, bodyHtml: string) {
  const fromHeader = fromName ? `"${fromName}" <${from}>` : from;
  const boundary = `b_${crypto.randomUUID().replace(/-/g, "")}`;
  const text = bodyHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const lines = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    bodyHtml,
    ``,
    `--${boundary}--`,
  ];
  const raw = lines.join("\r\n");
  const bytes = new TextEncoder().encode(raw);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendViaGmail(token: string, fromEmail: string, fromName: string | null, to: string, subject: string, html: string) {
  const raw = buildRawEmail(fromEmail, fromName, to, subject, html);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error?.message || `Gmail send failed (${res.status})`);
  return j.id as string;
}

// ---------- Outlook (Microsoft Graph) ----------
async function refreshOutlookToken(refreshToken: string) {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("MICROSOFT_OAUTH_CLIENT_ID")!,
      client_secret: Deno.env.get("MICROSOFT_OAUTH_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "openid profile offline_access https://graph.microsoft.com/Mail.Send",
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Outlook refresh failed: ${JSON.stringify(j)}`);
  return j as { access_token: string; refresh_token?: string; expires_in?: number };
}

async function getOutlookValidToken(admin: any, conn: any): Promise<string> {
  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
  if (conn.access_token && expiresAt > Date.now() + 60_000) return conn.access_token;
  if (!conn.refresh_token) throw new Error("Conexão Outlook sem refresh_token");
  const r = await refreshOutlookToken(conn.refresh_token);
  const newExpiresAt = new Date(Date.now() + (r.expires_in || 3600) * 1000).toISOString();
  await admin
    .from("marketing_email_connections")
    .update({
      access_token: r.access_token,
      refresh_token: r.refresh_token ?? conn.refresh_token,
      expires_at: newExpiresAt,
    })
    .eq("id", conn.id);
  return r.access_token;
}

async function sendViaOutlook(token: string, to: string, subject: string, html: string) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Outlook send failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  return null;
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
    if (campaign.channel !== "email") throw new Error("Apenas campanhas de e-mail são processadas aqui");

    const { data: conn, error: connErr } = await admin
      .from("marketing_email_connections")
      .select("*")
      .eq("id", campaign.email_connection_id)
      .single();
    if (connErr || !conn) throw new Error("Conexão de e-mail não encontrada");

    await admin
      .from("marketing_campaigns")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", campaign_id);

    const minMs = campaign.throttle_min_ms ?? 3000;
    const maxMs = campaign.throttle_max_ms ?? 8000;

    const { data: recipients } = await admin
      .from("marketing_campaign_recipients")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending")
      .order("created_at");

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < (recipients?.length || 0); i++) {
      const r = recipients![i];

      if (!isValidEmail(r.contact)) {
        await admin
          .from("marketing_campaign_recipients")
          .update({ status: "failed", error_message: "E-mail inválido (formato incorreto)" })
          .eq("id", r.id);
        failed++;
        continue;
      }

      // Soft "sending" tick — keep status valid by skipping the update if check
      // constraint excludes it. (status check allows: pending|sent|failed|skipped)
      const vars = { ...(r.variables || {}), nome: r.name || r.variables?.nome || "", email: r.contact };
      const personalizedSubject = substituteVars(campaign.subject || "", vars);
      const personalizedHtml = substituteVars(campaign.body || "", vars);

      try {
        if (conn.provider === "gmail") {
          const token = await getGmailValidToken(admin, conn);
          const msgId = await sendViaGmail(
            token,
            conn.email_address,
            conn.display_name,
            r.contact,
            personalizedSubject,
            personalizedHtml,
          );
          await admin
            .from("marketing_campaign_recipients")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              provider_message_id: msgId,
              error_message: null,
            })
            .eq("id", r.id);
        } else if (conn.provider === "outlook") {
          const token = await getOutlookValidToken(admin, conn);
          await sendViaOutlook(token, r.contact, personalizedSubject, personalizedHtml);
          await admin
            .from("marketing_campaign_recipients")
            .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
            .eq("id", r.id);
        } else {
          throw new Error(`Provider não suportado: ${conn.provider}`);
        }
        sent++;
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

    await admin
      .from("marketing_campaigns")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        sent_count: sent,
        failed_count: failed,
      })
      .eq("id", campaign_id);

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[process-marketing-campaign] ERRO:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
