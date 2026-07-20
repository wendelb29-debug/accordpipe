// Send Web Push notifications to a user's active subscriptions.
// Respects notification_preferences[category].push (defaults to true).
// Auto-deactivates dead subscriptions on 404/410.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@accordpipe.com.br";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) {
    console.error("[push-send] setVapidDetails failed:", e);
  }
}

interface SendBody {
  user_id: string;
  tenant_id?: string | null;
  category?: string; // notification category key (from Onda 16)
  title: string;
  body?: string;
  url?: string;
  icon?: string;
  tag?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    const payload = (await req.json()) as SendBody;
    if (!payload?.user_id || !payload?.title) {
      return json({ error: "missing_user_id_or_title" }, 400);
    }

    // Check per-category preference (default: allow, security always allowed)
    if (payload.category) {
      const { data: prof } = await admin
        .from("profiles")
        .select("notification_preferences")
        .eq("user_id", payload.user_id)
        .maybeSingle();
      const prefs = (prof as any)?.notification_preferences ?? {};
      const cat = prefs?.[payload.category];
      // Security is locked-on; other categories default to true (opt-out model)
      if (payload.category !== "security" && cat && cat.push === false) {
        return json({ ok: true, skipped: "push_disabled_for_category" });
      }
    }

    // Fetch active subscriptions (optionally scoped to tenant)
    let q = admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh_key, auth_key")
      .eq("user_id", payload.user_id)
      .eq("is_active", true);
    if (payload.tenant_id) q = q.eq("tenant_id", payload.tenant_id);

    const { data: subs, error } = await q;
    if (error) return json({ error: error.message }, 500);
    if (!subs || subs.length === 0) return json({ ok: true, delivered: 0 });

    const notif = {
      title: payload.title,
      body: payload.body || "",
      url: payload.url || "/",
      icon: payload.icon || "/accord-icon-192.png",
      tag: payload.tag || `accord-${Date.now()}`,
    };
    const bodyStr = JSON.stringify(notif);

    let delivered = 0;
    const deadIds: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } },
            bodyStr,
            { TTL: 60 },
          );
          delivered++;
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            deadIds.push(s.id);
          } else {
            console.error("[push-send] error", status, err?.body || err?.message);
          }
        }
      }),
    );

    if (deadIds.length) {
      await admin.from("push_subscriptions").update({ is_active: false }).in("id", deadIds);
    }

    return json({ ok: true, delivered, pruned: deadIds.length });
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
