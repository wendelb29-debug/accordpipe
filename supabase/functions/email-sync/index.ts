import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    
    const body = await req.json().catch(() => ({}));
    const accountId = body.accountId || body.account_id;
    
    if (!accountId) {
      return new Response(JSON.stringify({ error: "Missing accountId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: account, error } = await admin.from("email_accounts").select("*").eq("id", accountId).single();
    if (error || !account) throw new Error("Account not found");

    if (account.provider === "gmail") {
      // Call existing gmail sync logic (or we could inline it)
      const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-gmail-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ accountId }),
      });
      return resp;
    } else if (["outlook", "office365", "exchange"].includes(account.provider)) {
      await syncMicrosoft(account, admin);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Provider not supported" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("sync error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function syncMicrosoft(account: any, admin: any) {
  let accessToken = account.oauth_tokens?.access_token;
  const expiresAt = account.oauth_tokens?.expires_at;
  const refreshToken = account.oauth_tokens?.refresh_token;

  if (!accessToken || (expiresAt && new Date(expiresAt).getTime() < Date.now() + 60_000)) {
    const refreshed = await refreshMicrosoftToken(refreshToken);
    accessToken = refreshed.access_token;
    await admin.from("email_accounts").update({
      oauth_tokens: {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || refreshToken,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      },
    }).eq("id", account.id);
  }

  const sinceFilter = makeSinceFilter(account.import_since);
  const filterParam = sinceFilter ? `&$filter=receivedDateTime ge ${sinceFilter}` : "";
  const listUrl = `https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$top=50&$orderby=receivedDateTime desc${filterParam}&$select=id,subject,from,toRecipients,ccRecipients,bccRecipients,bodyPreview,body,isRead,hasAttachments,receivedDateTime,conversationId,categories,flag`;

  const listResp = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!listResp.ok) {
    const err = await listResp.text();
    await admin.from("email_accounts").update({
      status: "error",
      status_message: `Sync failed: ${err.slice(0, 200)}`,
    }).eq("id", account.id);
    return;
  }
  const list = await listResp.json();

  for (const msg of (list.value || [])) {
    const row = {
      account_id: account.id,
      servidor_id: account.servidor_id,
      provider_msg_id: msg.id,
      thread_id: msg.conversationId,
      folder: "inbox", // standardize to lowercase as in EmailInbox.tsx
      subject: msg.subject,
      from_email: msg.from?.emailAddress?.address,
      from_name: msg.from?.emailAddress?.name,
      to_emails: (msg.toRecipients || []).map((r: any) => ({ email: r.emailAddress?.address, name: r.emailAddress?.name })),
      cc_emails: (msg.ccRecipients || []).map((r: any) => ({ email: r.emailAddress?.address, name: r.emailAddress?.name })),
      bcc_emails: (msg.bccRecipients || []).map((r: any) => ({ email: r.emailAddress?.address, name: r.emailAddress?.name })),
      snippet: msg.bodyPreview,
      body_text: msg.body?.contentType === "text" ? msg.body?.content : null,
      body_html: msg.body?.contentType === "html" ? msg.body?.content : null,
      is_read: msg.isRead,
      is_starred: msg.flag?.flagStatus === "flagged",
      has_attachments: msg.hasAttachments,
      labels: msg.categories || [],
      received_at: msg.receivedDateTime,
    };
    await admin.from("email_messages").upsert(row, { onConflict: "account_id,provider_msg_id" });
  }

  await admin.from("email_accounts").update({
    status: "connected",
    status_message: null,
    last_synced_at: new Date().toISOString(),
  }).eq("id", account.id);
}

async function refreshMicrosoftToken(refreshToken: string) {
  const resp = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("MICROSOFT_OAUTH_CLIENT_ID", "ID_CLIENTE_OAUTH_MICROSOFT"),
      client_secret: requireEnv("MICROSOFT_OAUTH_CLIENT_SECRET", "SEGREDO_CLIENTE_OAUTH_MICROSOFT"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!resp.ok) throw new Error(`Refresh failed: ${await resp.text()}`);
  return await resp.json();
}

function makeSinceFilter(window?: string): string | null {
  const now = new Date();
  const offset: Record<string, number> = { "3days": 3, "1week": 7, "1month": 30, "3months": 90 };
  const days = offset[window || "1week"];
  if (!days) return null;
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}