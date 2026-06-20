import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireEnv, readEnv } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONEDRIVE_SCOPES = [
  "offline_access",
  "openid",
  "profile",
  "email",
  "User.Read",
  "Files.Read",
  "Files.Read.All",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { servidor_id, login_hint } = body || {};
    if (!servidor_id) {
      return new Response(JSON.stringify({ error: "servidor_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = requireEnv("MICROSOFT_OAUTH_CLIENT_ID", "ID_CLIENTE_OAUTH_MICROSOFT");
    const tenant = readEnv("MICROSOFT_OAUTH_TENANT", "TENANT_OAUTH_MICROSOFT") || "common";
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/drive-oauth-callback`;

    const state = btoa(JSON.stringify({
      userId,
      servidorId: servidor_id,
      provider: "microsoft",
      nonce: crypto.randomUUID(),
    }));

    const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", ONEDRIVE_SCOPES);
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("state", state);
    if (login_hint) url.searchParams.set("login_hint", String(login_hint));

    return new Response(JSON.stringify({ url: url.toString() }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
