import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireEnv, readEnv } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function redirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://accordpipe.com.br";
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");

    console.log("[email-oauth-callback] callback recebido", {
      hasCode: !!code, hasState: !!stateRaw, error: error,
    });

    if (error) {
      console.error("[email-oauth-callback] Erro reportado:", error, errorDesc);
      const q = new URLSearchParams({
        error: error,
        desc: errorDesc || "",
        stage: "ms_authz",
      });
      return redirect(`${appBaseUrl}/email?${q.toString()}`);
    }
    if (!code || !stateRaw) return redirect(`${appBaseUrl}/email?error=missing_code`);

    const state = JSON.parse(atob(stateRaw));
    const { userId, servidorId, provider, displayName, importSince, sharedSender, senderName, dailyLimit, crmIntegration, calendarIntegration } = state;

    const isOutlook = provider === "outlook";

    let access_token: string;
    let refresh_token: string | null = null;
    let expires_in = 3600;
    let scope = "";
    let emailAddress: string | null = null;
    let providerUserId: string | null = null;

    if (isOutlook) {
      const clientId = requireEnv("MICROSOFT_OAUTH_CLIENT_ID", "ID_CLIENTE_OAUTH_MICROSOFT");
      const clientSecret = requireEnv("MICROSOFT_OAUTH_CLIENT_SECRET", "SEGREDO_CLIENTE_OAUTH_MICROSOFT");
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const redirectUri = `${supabaseUrl}/functions/v1/email-oauth-callback`;
      
      const tenant = readEnv("MICROSOFT_OAUTH_TENANT", "TENANT_OAUTH_MICROSOFT") || "common";

      console.log("[oauth-callback] outlook env check:", { hasClientId: !!clientId, hasSecret: !!clientSecret, redirectUri, tenant });

      const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: "offline_access openid profile email User.Read Mail.Read Mail.ReadWrite Mail.Send",
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error("[email-oauth-callback] exchange falhou", tokens);
        const q = new URLSearchParams({
          error: tokens.error || "token_exchange",
          desc: tokens.error_description || "",
          stage: "ms_token",
        });
        return redirect(`${appBaseUrl}/email?${q.toString()}`);
      }
      access_token = tokens.access_token;
      refresh_token = tokens.refresh_token || null;
      expires_in = tokens.expires_in || 3600;
      scope = tokens.scope || "";

      const profRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const prof = await profRes.json();
      emailAddress = prof.mail || prof.userPrincipalName || null;
      providerUserId = prof.id || emailAddress;
      if (!emailAddress) return redirect(`${appBaseUrl}/email?error=no_email`);
    } else {
      const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID", "ID_CLIENTE_OAUTH_GOOGLE");
      const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET", "SEGREDO_CLIENTE_OAUTH_GOOGLE");
      const redirectUri = requireEnv("GOOGLE_OAUTH_REDIRECT_URI", "URI_REDIRECIONADA_OAUTH_GOOGLE");

      console.log("[oauth-callback] google env check:", { hasClientId: !!clientId, hasSecret: !!clientSecret, redirectUri });

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code, client_id: clientId, client_secret: clientSecret,
          redirect_uri: redirectUri, grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error("Token exchange failed", tokens);
        return redirect(`${appBaseUrl}/email?error=${encodeURIComponent(tokens.error || "token_exchange_failed")}`);
      }
      access_token = tokens.access_token;
      refresh_token = tokens.refresh_token || null;
      expires_in = tokens.expires_in || 3600;
      scope = tokens.scope || "";

      const profRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const prof = await profRes.json();
      emailAddress = prof.emailAddress;
      providerUserId = prof.emailAddress;
      if (!emailAddress) return redirect(`${appBaseUrl}/email?error=no_email`);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Upsert by (servidor_id, email_address)
    const { data: existing } = await admin
      .from("email_accounts")
      .select("id, oauth_tokens")
      .eq("servidor_id", servidorId)
      .eq("email_address", emailAddress)
      .maybeSingle();

    const payload = {
      servidor_id: servidorId,
      user_id: userId,
      provider,
      display_name: displayName || (isOutlook ? "Outlook" : "Gmail"),
      email_address: emailAddress,
      status: "connected",
      status_message: null,
      shared_sender: !!sharedSender,
      sender_name: sharedSender ? (senderName || null) : null,
      daily_limit: dailyLimit ? Number(dailyLimit) : null,
      import_since: importSince || "1week",
      crm_integration: !!crmIntegration,
      calendar_integration: !!calendarIntegration,
      oauth_tokens: {
        access_token,
        refresh_token: refresh_token || existing?.oauth_tokens?.refresh_token || null,
        expires_at: expiresAt,
      },
      oauth_scopes: scope,
      oauth_provider_user_id: providerUserId,
    };

    let accountId: string;
    if (existing) {
      const { error: upErr } = await admin.from("email_accounts").update(payload).eq("id", existing.id);
      if (upErr) {
        console.error("update error", upErr);
        return redirect(`${appBaseUrl}/email?error=db_update`);
      }
      accountId = existing.id;
    } else {
      const { data: ins, error: insErr } = await admin.from("email_accounts").insert(payload).select("id").single();
      if (insErr) {
        console.error("insert error", insErr);
        return redirect(`${appBaseUrl}/email?error=db_insert`);
      }
      accountId = ins.id;
    }

    // Trigger initial sync using the generic sync function
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ accountId }),
    }).catch(() => {});

    return redirect(`${appBaseUrl}/email?connected=${accountId}`);
  } catch (err) {
    console.error("callback error", err);
    return redirect(`${appBaseUrl}/email?error=${encodeURIComponent(String(err))}`);
  }
});
