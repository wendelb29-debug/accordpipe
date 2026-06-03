import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Mail.ReadWrite",
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/MailboxSettings.Read",
  "https://graph.microsoft.com/User.Read",
].join(" ");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const accountDraft = body.account_draft || {};
  const provider = body.provider || "outlook"; 

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile } = await adminClient
    .from("profiles").select("company_id").eq("user_id", user.id).maybeSingle();
  const servidorId = profile?.company_id;

  const { data: existingAccount } = await adminClient
    .from("email_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .eq("email_address", "pending@pending")
    .eq("status", "pending")
    .maybeSingle();

  let accountId: string;
  if (existingAccount) {
    accountId = existingAccount.id;
    await adminClient
      .from("email_accounts")
      .update({
        display_name: accountDraft.display_name || "Outlook",
        import_since: accountDraft.import_since || "1week",
        crm_integration: accountDraft.crm_integration ?? true,
        calendar_integration: accountDraft.calendar_integration ?? false,
        shared_sender: accountDraft.shared_sender ?? false,
        sender_name: accountDraft.sender_name,
        daily_limit: accountDraft.daily_limit,
      })
      .eq("id", accountId);
  } else {
    const { data: newAccount, error: insErr } = await adminClient
      .from("email_accounts")
      .insert({
        user_id: user.id,
        servidor_id: servidorId,
        provider,
        display_name: accountDraft.display_name || "Outlook",
        email_address: accountDraft.email_address || "pending@pending",
        status: "pending",
        import_since: accountDraft.import_since || "1week",
        crm_integration: accountDraft.crm_integration ?? true,
        calendar_integration: accountDraft.calendar_integration ?? false,
        shared_sender: accountDraft.shared_sender ?? false,
        sender_name: accountDraft.sender_name,
        daily_limit: accountDraft.daily_limit,
      })
      .select()
      .single();

    if (insErr || !newAccount) {
      return new Response(JSON.stringify({ error: insErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    accountId = newAccount.id;
  }

  const state = btoa(JSON.stringify({
    account_id: accountId,
    user_id: user.id,
    servidor_id: servidorId,
  }));

  const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  const clientId = requireEnv("ID_CLIENTE_OAUTH_MICROSOFT", "MICROSOFT_OAUTH_CLIENT_ID");
  const redirectUri = requireEnv("URI_REDIRECIONADA_OAUTH_MICROSOFT", "MICROSOFT_OAUTH_REDIRECT_URI");

  console.log(`[Start] Redirecting user ${user.id} to Microsoft. ClientID: ${clientId.slice(0, 8)}..., RedirectURI: ${redirectUri}`);

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  return new Response(JSON.stringify({ url: authUrl.toString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});