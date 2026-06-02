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
  if (tokens.access_token && expiresAt > Date.now() + 60_000) return tokens.access_token;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messageRowId, action } = await req.json();
    if (!messageRowId || !action) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: msg } = await admin.from("email_messages").select("*").eq("id", messageRowId).single();
    if (!msg) return new Response(JSON.stringify({ error: "Message not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: account } = await admin.from("email_accounts").select("*").eq("id", msg.account_id).single();
    const accessToken = await getValidToken(admin, account);

    let body: any = {};
    let dbUpdate: any = {};
    if (action === "markRead") { body = { removeLabelIds: ["UNREAD"] }; dbUpdate = { is_read: true }; }
    else if (action === "markUnread") { body = { addLabelIds: ["UNREAD"] }; dbUpdate = { is_read: false }; }
    else if (action === "star") { body = { addLabelIds: ["STARRED"] }; dbUpdate = { is_starred: true }; }
    else if (action === "unstar") { body = { removeLabelIds: ["STARRED"] }; dbUpdate = { is_starred: false }; }
    else if (action === "trash") { /* uses different endpoint */ }
    else return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "trash") {
      const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.provider_msg_id}/trash`, {
        method: "POST", headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!r.ok) return new Response(JSON.stringify({ error: await r.text() }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await admin.from("email_messages").delete().eq("id", messageRowId);
    } else {
      const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.provider_msg_id}/modify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) return new Response(JSON.stringify({ error: await r.text() }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await admin.from("email_messages").update(dbUpdate).eq("id", messageRowId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
