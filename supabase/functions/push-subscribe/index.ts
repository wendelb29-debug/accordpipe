// Register/upsert a Web Push subscription for the authenticated user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: uData } = await userClient.auth.getUser();
    const user = uData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { action, subscription, tenant_id, endpoint } = body || {};
    const admin = createClient(url, service);

    if (action === "unsubscribe") {
      const target = endpoint || subscription?.endpoint;
      if (!target) return json({ error: "missing_endpoint" }, 400);
      await admin
        .from("push_subscriptions")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("endpoint", target);
      return json({ ok: true });
    }

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return json({ error: "invalid_subscription" }, 400);
    }
    if (!tenant_id) return json({ error: "missing_tenant_id" }, 400);

    const ua = req.headers.get("user-agent") || null;
    const payload = {
      user_id: user.id,
      tenant_id,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      user_agent: ua,
      is_active: true,
      last_used_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("push_subscriptions")
      .upsert(payload, { onConflict: "user_id,tenant_id,endpoint" });
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
