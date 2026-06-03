import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const appBase = Deno.env.get("APP_BASE_URL") || "https://accordpipe.com.br";

  if (errorParam || !code || !stateRaw) {
    return Response.redirect(`${appBase}/email?error=${encodeURIComponent(errorParam || "missing_code")}`, 302);
  }

  let state: { account_id: string; user_id: string; servidor_id: string };
  try {
    state = JSON.parse(atob(stateRaw));
  } catch {
    return Response.redirect(`${appBase}/email?error=invalid_state`, 302);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const tokenResp = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("MICROSOFT_OAUTH_CLIENT_ID", "ID_CLIENTE_OAUTH_MICROSOFT"),
      client_secret: requireEnv("MICROSOFT_OAUTH_CLIENT_SECRET", "SEGREDO_CLIENTE_OAUTH_MICROSOFT"),
      code,
      redirect_uri: requireEnv("MICROSOFT_OAUTH_REDIRECT_URI", "URI_REDIRECIONADA_OAUTH_MICROSOFT"),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    await admin.from("email_accounts").update({
      status: "error",
      status_message: `Token exchange failed: ${errText.slice(0, 200)}`,
    }).eq("id", state.account_id);
    return Response.redirect(`${appBase}/email?error=token_exchange`, 302);
  }

  const tokens = await tokenResp.json();
  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token;
  const expiresIn = tokens.expires_in;
  const scopes = tokens.scope;

  const meResp = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meResp.ok) {
    const errText = await meResp.text();
    await admin.from("email_accounts").update({
      status: "error",
      status_message: `Graph /me failed: ${errText.slice(0, 200)}`,
    }).eq("id", state.account_id);
    return Response.redirect(`${appBase}/email?error=user_info`, 302);
  }

  const me = await meResp.json();
  const emailAddress = me.mail || me.userPrincipalName;
  const displayName = me.displayName;

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await admin
    .from("email_accounts")
    .update({
      email_address: emailAddress,
      display_name: displayName || "Outlook",
      status: "connected",
      status_message: null,
      oauth_provider_user_id: me.id,
      oauth_scopes: scopes,
      oauth_tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      },
      last_synced_at: null,
    })
    .eq("id", state.account_id);

  try {
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ accountId: state.account_id }),
    }).catch(() => {});
  } catch (_e) { }

  return Response.redirect(`${appBase}/email?connected=${state.account_id}`, 302);
});