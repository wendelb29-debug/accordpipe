// Backfill: sync profile pictures + names for all whatsapp_contacts of a tenant
// that don't have an avatar yet. Uses uazapi /chat/GetNameAndImageURL per phone.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(p: string | null | undefined): string {
  return String(p || "").replace(/\D/g, "");
}

async function fetchProfile(serverUrl: string, token: string, phone: string) {
  const url = `${serverUrl.replace(/\/$/, "")}/chat/GetNameAndImageURL`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { token, "Content-Type": "application/json" },
      body: JSON.stringify({ number: phone, preview: false }),
    });
    if (!res.ok) return null;
    const json: any = await res.json().catch(() => null);
    if (!json) return null;
    const image =
      json?.image || json?.imgUrl || json?.profilePicture || json?.url || json?.profile_picture || null;
    const name =
      json?.name || json?.pushname || json?.verifiedName || json?.shortName || null;
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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const tenant_id: string | undefined = body?.tenant_id;
    const force: boolean = !!body?.force;
    const limit: number = Math.min(Math.max(Number(body?.limit) || 200, 1), 500);

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Try uazapi integration first (active, most recent)
    const { data: integ } = await admin
      .from("tenant_whatsapp_integrations")
      .select("server_url, instance_token, provider_type")
      .eq("tenant_id", tenant_id)
      .eq("provider_type", "uazapi")
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!integ?.server_url || !integ?.instance_token) {
      return new Response(
        JSON.stringify({ success: false, message: "Integração uazapi não configurada para este tenant." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pick contacts to sync
    let q = admin
      .from("whatsapp_contacts")
      .select("id, phone, name, avatar_url")
      .eq("company_id", tenant_id)
      .limit(limit);

    if (!force) {
      q = q.or("avatar_url.is.null,avatar_url.eq.");
    }

    const { data: contacts, error: cErr } = await q;
    if (cErr) {
      return new Response(JSON.stringify({ error: cErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    let failed = 0;
    const total = contacts?.length || 0;

    // Sequential to avoid uazapi rate limits
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
      if (uErr) failed++;
      else if (updates.avatar_url) updated++;
      // Light throttle (~5 req/s)
      await new Promise((r) => setTimeout(r, 200));
    }

    return new Response(
      JSON.stringify({ success: true, total, updated, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[whatsapp-sync-all-avatars] error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
