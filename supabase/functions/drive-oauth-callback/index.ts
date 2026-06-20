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
  const back = (qs: string) => redirect(`${appBaseUrl}/documentos?${qs}`);

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");

    if (error) {
      return back(new URLSearchParams({ drive_error: error, desc: errorDesc || "" }).toString());
    }
    if (!code || !stateRaw) return back("drive_error=missing_code");

    const state = JSON.parse(atob(stateRaw));
    const { userId, servidorId, provider } = state;
    const isMicrosoft = provider === "microsoft";

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/drive-oauth-callback`;

    let access_token: string;
    let refresh_token: string | null = null;
    let expires_in = 3600;
    let scope = "";
    let email: string | null = null;
    let displayName: string | null = null;
    let providerUserId: string | null = null;
    let quotaTotal: number | null = null;
    let quotaUsed: number | null = null;

    if (isMicrosoft) {
      const clientId = requireEnv("MICROSOFT_OAUTH_CLIENT_ID", "ID_CLIENTE_OAUTH_MICROSOFT");
      const clientSecret = requireEnv("MICROSOFT_OAUTH_CLIENT_SECRET", "SEGREDO_CLIENTE_OAUTH_MICROSOFT");
      const tenant = readEnv("MICROSOFT_OAUTH_TENANT", "TENANT_OAUTH_MICROSOFT") || "common";

      const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code, client_id: clientId, client_secret: clientSecret,
          redirect_uri: redirectUri, grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error("[drive-callback ms] token exchange failed", tokens);
        return back(`drive_error=${encodeURIComponent(tokens.error || "token_exchange_failed")}`);
      }
      access_token = tokens.access_token;
      refresh_token = tokens.refresh_token || null;
      expires_in = tokens.expires_in || 3600;
      scope = tokens.scope || "";

      const profRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const prof = await profRes.json();
      email = prof.mail || prof.userPrincipalName || null;
      displayName = prof.displayName || email;
      providerUserId = prof.id || email;

      // OneDrive quota
      try {
        const driveRes = await fetch("https://graph.microsoft.com/v1.0/me/drive", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const drive = await driveRes.json();
        if (drive?.quota) {
          quotaTotal = drive.quota.total ?? null;
          quotaUsed = drive.quota.used ?? null;
        }
      } catch (e) {
        console.warn("[drive-callback ms] quota fetch failed", e);
      }
    } else {
      const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID", "ID_CLIENTE_OAUTH_GOOGLE");
      const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET", "SEGREDO_CLIENTE_OAUTH_GOOGLE");

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
        console.error("[drive-callback google] token exchange failed", tokens);
        return back(`drive_error=${encodeURIComponent(tokens.error || "token_exchange_failed")}`);
      }
      access_token = tokens.access_token;
      refresh_token = tokens.refresh_token || null;
      expires_in = tokens.expires_in || 3600;
      scope = tokens.scope || "";

      // userinfo + drive about (quota)
      try {
        const uiRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const ui = await uiRes.json();
        email = ui.email || null;
        displayName = ui.name || email;
        providerUserId = ui.sub || email;
      } catch (e) {
        console.warn("[drive-callback google] userinfo failed", e);
      }

      try {
        const aboutRes = await fetch(
          "https://www.googleapis.com/drive/v3/about?fields=storageQuota,user",
          { headers: { Authorization: `Bearer ${access_token}` } },
        );
        const about = await aboutRes.json();
        if (about?.storageQuota) {
          quotaTotal = about.storageQuota.limit ? Number(about.storageQuota.limit) : null;
          quotaUsed = about.storageQuota.usage ? Number(about.storageQuota.usage) : null;
        }
        if (!email && about?.user?.emailAddress) email = about.user.emailAddress;
      } catch (e) {
        console.warn("[drive-callback google] about failed", e);
      }
    }

    if (!email) return back("drive_error=no_email");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const { data: existing } = await admin
      .from("cloud_drive_accounts")
      .select("id, oauth_tokens, user_id")
      .eq("user_id", userId)
      .eq("servidor_id", servidorId)
      .eq("provider", isMicrosoft ? "microsoft" : "google")
      .eq("email", email)
      .maybeSingle();

    const payload: any = {
      user_id: userId,
      servidor_id: servidorId,
      provider: isMicrosoft ? "microsoft" : "google",
      email,
      display_name: displayName,
      provider_user_id: providerUserId,
      oauth_tokens: {
        access_token,
        refresh_token: refresh_token || existing?.oauth_tokens?.refresh_token || null,
        expires_at: expiresAt,
      },
      oauth_scopes: scope,
      quota_total: quotaTotal,
      quota_used: quotaUsed,
      quota_synced_at: new Date().toISOString(),
    };

    if (existing) {
      await admin.from("cloud_drive_accounts").update(payload).eq("id", existing.id);
    } else {
      await admin.from("cloud_drive_accounts").insert(payload);
    }

    return back(`drive_connected=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error("[drive-oauth-callback] erro", err);
    return redirect(`${appBaseUrl}/documentos?drive_error=${encodeURIComponent(String(err?.message || err))}`);
  }
});
