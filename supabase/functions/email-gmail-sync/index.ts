import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshAccessToken(refreshToken: string) {
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
  if (!res.ok) throw new Error(`Refresh failed: ${JSON.stringify(j)}`);
  return j;
}

async function getValidToken(admin: any, account: any): Promise<string> {
  const tokens = account.oauth_tokens || {};
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0;
  if (tokens.access_token && expiresAt > Date.now() + 60_000) {
    return tokens.access_token;
  }
  if (!tokens.refresh_token) throw new Error("No refresh token");
  const refreshed = await refreshAccessToken(tokens.refresh_token);
  const newTokens = {
    access_token: refreshed.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
  };
  await admin.from("email_accounts").update({ oauth_tokens: newTokens }).eq("id", account.id);
  return refreshed.access_token;
}

function parseHeaders(headers: any[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers || []) out[h.name.toLowerCase()] = h.value;
  return out;
}

function parseAddress(s: string | undefined): { email: string; name: string } {
  if (!s) return { email: "", name: "" };
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { email: s.trim(), name: "" };
}

function decodeBase64Url(s: string): string {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
  } catch { return ""; }
}

function extractBodies(payload: any): { text: string; html: string } {
  let text = "", html = "";
  function walk(part: any) {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) text += decodeBase64Url(part.body.data);
    else if (part.mimeType === "text/html" && part.body?.data) html += decodeBase64Url(part.body.data);
    for (const p of part.parts || []) walk(p);
  }
  walk(payload);
  return { text, html };
}

function importSinceQuery(importSince: string): string {
  const map: Record<string, number> = { "3days": 3, "1week": 7, "1month": 30, "3months": 90 };
  const days = map[importSince];
  if (!days) return "";
  const d = new Date(Date.now() - days * 86400_000);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return ` after:${y}/${m}/${day}`;
}

async function syncFolder(admin: any, account: any, accessToken: string, folder: "inbox" | "sent" | "important") {
  const labelMap: Record<string, string> = { inbox: "INBOX", sent: "SENT", important: "IMPORTANT" };
  const q = `in:${labelMap[folder].toLowerCase()} -in:spam -in:trash -in:drafts${importSinceQuery(account.import_since)}`;
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q", q);
  listUrl.searchParams.set("maxResults", "30");

  const listRes = await fetch(listUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!listRes.ok) {
    console.error(`list ${folder} failed`, await listRes.text());
    return 0;
  }
  const list = await listRes.json();
  const msgs = list.messages || [];
  let inserted = 0;

  for (const m of msgs) {
    // skip if already exists
    const { data: ex } = await admin
      .from("email_messages")
      .select("id")
      .eq("account_id", account.id)
      .eq("provider_msg_id", m.id)
      .maybeSingle();
    if (ex) continue;

    const detRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!detRes.ok) continue;
    const det = await detRes.json();
    const headers = parseHeaders(det.payload?.headers);
    const from = parseAddress(headers["from"]);
    const toList = (headers["to"] || "").split(",").map((s) => parseAddress(s)).filter((p) => p.email);
    const ccList = (headers["cc"] || "").split(",").map((s) => parseAddress(s)).filter((p) => p.email);
    const { text, html } = extractBodies(det.payload);
    const labels: string[] = det.labelIds || [];
    const isRead = !labels.includes("UNREAD");
    const isStarred = labels.includes("STARRED");

    await admin.from("email_messages").insert({
      account_id: account.id,
      servidor_id: account.servidor_id,
      provider_msg_id: det.id,
      thread_id: det.threadId,
      folder,
      from_email: from.email,
      from_name: from.name,
      to_emails: toList,
      cc_emails: ccList,
      subject: headers["subject"] || "(sem assunto)",
      snippet: det.snippet || "",
      body_text: text || null,
      body_html: html || null,
      is_read: isRead,
      is_starred: isStarred,
      labels,
      has_attachments: (det.payload?.parts || []).some((p: any) => p.filename),
      received_at: det.internalDate ? new Date(Number(det.internalDate)).toISOString() : new Date().toISOString(),
    });
    inserted++;
  }
  return inserted;
}

async function syncAccount(admin: any, accountId: string) {
  const { data: account, error } = await admin.from("email_accounts").select("*").eq("id", accountId).single();
  if (error || !account) throw new Error("Account not found");
  if (account.provider !== "gmail") return { skipped: true };

  const accessToken = await getValidToken(admin, account);
  const inboxCount = await syncFolder(admin, account, accessToken, "inbox");
  const sentCount = await syncFolder(admin, account, accessToken, "sent");
  const importantCount = await syncFolder(admin, account, accessToken, "important");

  await admin.from("email_accounts").update({
    last_synced_at: new Date().toISOString(),
    status: "connected",
    status_message: null,
  }).eq("id", account.id);

  return { inbox: inboxCount, sent: sentCount, important: importantCount };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({}));

    if (body.accountId) {
      const result = await syncAccount(admin, body.accountId);
      return new Response(JSON.stringify({ ok: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sync all connected Gmail accounts
    const { data: accounts } = await admin
      .from("email_accounts")
      .select("id")
      .eq("provider", "gmail")
      .eq("status", "connected");

    const results: any[] = [];
    for (const a of accounts || []) {
      try {
        const r = await syncAccount(admin, a.id);
        results.push({ accountId: a.id, ...r });
      } catch (e) {
        results.push({ accountId: a.id, error: String(e) });
        await admin.from("email_accounts").update({
          status: "error", status_message: String(e),
        }).eq("id", a.id);
      }
    }
    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
