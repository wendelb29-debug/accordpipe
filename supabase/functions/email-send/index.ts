import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { accountId, to, cc, bcc, subject, html, text, threadId } = body;
    
    if (!accountId) {
      return new Response(JSON.stringify({ error: "Missing accountId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: account, error } = await admin.from("email_accounts").select("*").eq("id", accountId).single();
    if (error || !account) throw new Error("Account not found");

    if (account.provider === "gmail") {
      const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-gmail-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") || "",
        },
        body: JSON.stringify(body),
      });
      return resp;
    } else if (["outlook", "office365", "exchange"].includes(account.provider)) {
      await sendMicrosoft(account, body, admin);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Provider not supported" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("send error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function ensureFreshMicrosoftToken(account: any, admin: any) {
  let accessToken = account.oauth_tokens?.access_token;
  const expiresAt = account.oauth_tokens?.expires_at;
  const refreshToken = account.oauth_tokens?.refresh_token;

  if (!accessToken || (expiresAt && new Date(expiresAt).getTime() < Date.now() + 60_000)) {
    const resp = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("MICROSOFT_OAUTH_CLIENT_ID")!,
        client_secret: Deno.env.get("MICROSOFT_OAUTH_CLIENT_SECRET")!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!resp.ok) throw new Error(`Refresh failed: ${await resp.text()}`);
    const refreshed = await resp.json();
    accessToken = refreshed.access_token;
    await admin.from("email_accounts").update({
      oauth_tokens: {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || refreshToken,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      },
    }).eq("id", account.id);
  }
  return accessToken;
}

async function sendMicrosoft(account: any, draft: any, admin: any) {
  const accessToken = await ensureFreshMicrosoftToken(account, admin);

  const toList = Array.isArray(draft.to) ? draft.to : (draft.to ? [draft.to] : []);
  const ccList = Array.isArray(draft.cc) ? draft.cc : (draft.cc ? [draft.cc] : []);
  const bccList = Array.isArray(draft.bcc) ? draft.bcc : (draft.bcc ? [draft.bcc] : []);

  const message = {
    message: {
      subject: draft.subject,
      body: {
        contentType: draft.html ? "html" : "text",
        content: draft.html || draft.text || "",
      },
      toRecipients: toList.map((addr: string) => ({ emailAddress: { address: addr } })),
      ccRecipients: ccList.map((addr: string) => ({ emailAddress: { address: addr } })),
      bccRecipients: bccList.map((addr: string) => ({ emailAddress: { address: addr } })),
    },
    saveToSentItems: true,
  };

  const resp = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!resp.ok) {
    throw new Error(`Microsoft send failed: ${await resp.text()}`);
  }
}