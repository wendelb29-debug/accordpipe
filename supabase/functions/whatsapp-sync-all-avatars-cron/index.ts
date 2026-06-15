// Periodic cron worker: walks every tenant with an active uazapi integration
// and refreshes WhatsApp contact avatars/names in background.
// Triggered by pg_cron every 6h.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(p: string | null | undefined): string {
  return String(p || "").replace(/\D/g, "");
}

async function fetchProfile(serverUrl: string, token: string, phone: string) {
  try {
    const r = await fetch(`${serverUrl.replace(/\/$/, "")}/chat/GetNameAndImageURL`, {
      method: "POST",
      headers: { token, "Content-Type": "application/json" },
      body: JSON.stringify({ number: phone, preview: false }),
    });
    if (!r.ok) return null;
    const j: any = await r.json().catch(() => null);
    if (!j) return null;
    const image = j?.image || j?.imgUrl || j?.profilePicture || j?.url || j?.profile_picture || null;
    const name = j?.name || j?.pushname || j?.verifiedName || j?.shortName || null;
    return {
      image: typeof image === "string" && image.startsWith("http") ? image : null,
      name: typeof name === "string" && name.trim() ? name.trim() : null,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let totalSynced = 0;
  let totalFailed = 0;
  let tenantsProcessed = 0;

  try {
    // Get all active uazapi integrations
    const { data: integrations } = await admin
      .from("tenant_whatsapp_integrations")
      .select("tenant_id, server_url, instance_token")
      .eq("provider_type", "uazapi")
      .eq("is_active", true);

    for (const integ of integrations || []) {
      if (!integ.server_url || !integ.instance_token) continue;
      tenantsProcessed++;

      // Pick stale or never-synced contacts (cap 30 per tenant per run)
      const { data: contacts } = await admin
        .from("whatsapp_contacts")
        .select("id, phone, name, avatar_url, avatar_synced_at")
        .eq("company_id", integ.tenant_id)
        .or(`avatar_url.is.null,avatar_synced_at.is.null,avatar_synced_at.lt.${sevenDaysAgo}`)
        .order("avatar_synced_at", { ascending: true, nullsFirst: true })
        .limit(30);

      for (const c of contacts || []) {
        const phone = normalizePhone(c.phone);
        if (!phone) continue;
        const prof = await fetchProfile(integ.server_url, integ.instance_token, phone);
        const updates: any = { avatar_synced_at: new Date().toISOString() };
        if (prof?.image) updates.avatar_url = prof.image;
        if (prof?.name) {
          const cur = String(c.name || "").replace(/\D/g, "");
          if (!c.name || cur === phone) updates.name = prof.name;
        }
        const { error: uErr } = await admin
          .from("whatsapp_contacts")
          .update(updates)
          .eq("id", c.id);
        if (uErr) totalFailed++;
        else if (updates.avatar_url) totalSynced++;
        // gentle throttle to avoid uazapi rate limit
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    console.log(`[avatar-sync-cron] tenants=${tenantsProcessed} synced=${totalSynced} failed=${totalFailed}`);
    return new Response(
      JSON.stringify({ ok: true, tenants: tenantsProcessed, synced: totalSynced, failed: totalFailed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[avatar-sync-cron] error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
