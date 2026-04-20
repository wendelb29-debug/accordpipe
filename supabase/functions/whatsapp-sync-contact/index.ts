import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache: skip sync if synced within last 6 hours
const SYNC_TTL_MS = 6 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contact_id, force } = await req.json();
    if (!contact_id) {
      return new Response(JSON.stringify({ error: "contact_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: contact } = await supabase
      .from("whatsapp_contacts")
      .select("id, company_id, phone, name, avatar_url, avatar_synced_at")
      .eq("id", contact_id)
      .maybeSingle();

    if (!contact) {
      return new Response(JSON.stringify({ error: "contact not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TTL check
    if (!force && contact.avatar_synced_at) {
      const age = Date.now() - new Date(contact.avatar_synced_at).getTime();
      if (age < SYNC_TTL_MS && contact.avatar_url) {
        return new Response(JSON.stringify({ success: true, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get uazapi credentials
    const { data: integ } = await supabase
      .from("whatsapp_integrations")
      .select("server_url, instance_token")
      .eq("tenant_id", contact.company_id)
      .eq("provider_type", "uazapi")
      .maybeSingle();

    if (!integ?.server_url || !integ?.instance_token) {
      return new Response(JSON.stringify({ success: false, reason: "no integration" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = String(contact.phone || "").replace(/\D/g, "");
    const url = `${integ.server_url.replace(/\/$/, "")}/chat/GetNameAndImageURL`;

    const res = await fetch(url, {
      method: "POST",
      headers: { token: integ.instance_token, "Content-Type": "application/json" },
      body: JSON.stringify({ number: phone, preview: false }),
    });

    if (!res.ok) {
      console.warn("[whatsapp-sync-contact] non-ok", res.status);
      return new Response(JSON.stringify({ success: false, status: res.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json: any = await res.json().catch(() => null);
    const image = json?.image || json?.imgUrl || json?.profilePicture || json?.url || json?.profile_picture || null;
    const name = json?.name || json?.pushname || json?.verifiedName || json?.shortName || null;

    const updates: any = { avatar_synced_at: new Date().toISOString() };
    if (typeof image === "string" && image.startsWith("http")) {
      updates.avatar_url = image;
    }
    if (typeof name === "string" && name.trim()) {
      // Only overwrite if current is empty or equals phone
      const cur = String(contact.name || "").replace(/\D/g, "");
      if (!contact.name || cur === phone) {
        updates.name = name.trim();
      }
    }

    await supabase.from("whatsapp_contacts").update(updates).eq("id", contact_id);

    return new Response(JSON.stringify({
      success: true,
      avatar_url: updates.avatar_url || contact.avatar_url,
      name: updates.name || contact.name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[whatsapp-sync-contact] error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
