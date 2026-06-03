import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireEnv, readEnv } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.labels",
  "openid",
  "email",
  "profile",
].join(" ");

const OUTLOOK_SCOPES = [
  "offline_access",
  "openid",
  "profile",
  "email",
  "User.Read",
  "Mail.Read",
  "Mail.ReadWrite",
  "Mail.Send",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    console.log("[email-oauth-start] iniciando");
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
    const userId = userData.user.id;

    const body = await req.json();
    const { provider, displayName, importSince, sharedSender, senderName, dailyLimit, crmIntegration, calendarIntegration } = body;

    if (provider !== "gmail" && provider !== "outlook") {
      return new Response(JSON.stringify({ error: "OAuth suportado apenas para Gmail e Outlook" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isOutlook = provider === "outlook";
    const clientId = isOutlook
      ? requireEnv("MICROSOFT_OAUTH_CLIENT_ID", "ID_CLIENTE_OAUTH_MICROSOFT")
      : requireEnv("GOOGLE_OAUTH_CLIENT_ID", "ID_CLIENTE_OAUTH_GOOGLE");

    // Prefer generic callback, but fallback to secret if provided. 
    // If the secret is the "callback-microsoft" one, we transition it to the generic one.
    // Use the exact redirect URI confirmed by the user for Outlook
    let redirectUri: string;
    if (isOutlook) {
      redirectUri = "https://nglwgzknqgihlbkdnflu.supabase.co/functions/v1/email-oauth-callback-microsoft";
    } else {
      redirectUri = readEnv("GOOGLE_OAUTH_REDIRECT_URI", "URI_REDIRECIONADA_OAUTH_GOOGLE");
      if (!redirectUri) {
        redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/email-oauth-callback`;
      }
    }
    
    console.log(`[oauth-start] Using redirect URI: ${redirectUri}`);

    if (!clientId || !redirectUri) {
      return new Response(JSON.stringify({ error: "OAuth não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve tenant
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: profile } = await admin
      .from("profiles").select("company_id").eq("user_id", userId).maybeSingle();
    const servidorId = profile?.company_id;
    if (!servidorId) {
      return new Response(JSON.stringify({ error: "Tenant não encontrado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state = btoa(JSON.stringify({
      userId, servidorId, provider,
      displayName, importSince, sharedSender, senderName, dailyLimit,
      crmIntegration, calendarIntegration,
      nonce: crypto.randomUUID(),
    }));

    let url: URL;
    console.log(`[oauth-start] DEBUG - ClientID: "${clientId}", RedirectURI: "${redirectUri}"`);
    
    if (isOutlook) {
      const tenant = readEnv("MICROSOFT_OAUTH_TENANT", "TENANT_OAUTH_MICROSOFT") || "common";
      url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("response_mode", "query");
      url.searchParams.set("scope", OUTLOOK_SCOPES);
      url.searchParams.set("prompt", "select_account");
      url.searchParams.set("state", state);
    } else {
      url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", GMAIL_SCOPES);
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "select_account consent");
      url.searchParams.set("include_granted_scopes", "true");
      url.searchParams.set("state", state);
    }

    return new Response(JSON.stringify({ url: url.toString() }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
