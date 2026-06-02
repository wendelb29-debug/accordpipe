import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    if (error) return redirect(`${appBaseUrl}/email?error=${encodeURIComponent(error)}`);
    if (!code || !stateRaw) return redirect(`${appBaseUrl}/email?error=missing_code`);

    const state = JSON.parse(atob(stateRaw));
    const { userId, servidorId, provider, displayName, importSince, sharedSender, senderName, dailyLimit, crmIntegration, calendarIntegration } = state;

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
    const redirectUri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI")!;

    // Exchange code for tokens
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

    const { access_token, refresh_token, expires_in, scope } = tokens;

    // Get user email from Gmail profile
    const profRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const prof = await profRes.json();
    const emailAddress = prof.emailAddress;
    if (!emailAddress) {
      return redirect(`${appBaseUrl}/email?error=no_email`);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

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
      display_name: displayName || "Gmail",
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
      oauth_provider_user_id: prof.emailAddress,
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

    // Trigger initial sync (fire and forget)
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-gmail-sync`, {
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
