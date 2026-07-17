// Onda 21: mark a WhatsApp chat as read on the uazapi provider side.
// Fire-and-forget from the client when the user opens a conversation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callUazapi } from "../_shared/uazapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate the caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contact_id } = await req.json();
    if (!contact_id) {
      return new Response(JSON.stringify({ error: "contact_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svc = createClient(supabaseUrl, serviceKey);

    // Load contact + resolve tenant
    const { data: contact } = await svc
      .from("whatsapp_contacts")
      .select("id, company_id, phone")
      .eq("id", contact_id)
      .maybeSingle();

    if (!contact) {
      return new Response(JSON.stringify({ error: "contact not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenant scoping: caller must belong to the tenant
    const { data: membership } = await svc
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", contact.company_id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Zero unread_count immediately server-side (defense-in-depth beyond client optimistic update)
    await svc
      .from("whatsapp_contacts")
      .update({ unread_count: 0, updated_at: new Date().toISOString() })
      .eq("id", contact_id);

    // Also zero the chat row if it exists (Onda 7's whatsapp_chats)
    if (contact.phone) {
      await svc
        .from("whatsapp_chats")
        .update({ unread_count: 0 })
        .eq("tenant_id", contact.company_id)
        .ilike("wa_chatid", `${String(contact.phone).replace(/\D/g, "")}%`);
    }

    // Best-effort: tell uazapi to mark it as read on WhatsApp
    const { data: integ } = await svc
      .from("tenant_whatsapp_integrations")
      .select("instance_token")
      .eq("company_id", contact.company_id)
      .eq("is_active", true)
      .maybeSingle();

    const token = (integ as any)?.instance_token;
    if (token && contact.phone) {
      const digits = String(contact.phone).replace(/\D/g, "");
      // uazapi: POST /message/markread with { number, read: true }
      try {
        await callUazapi("/message/markread", {
          method: "POST",
          token,
          body: { number: digits, read: true },
        });
      } catch (e) {
        console.warn("[uazapi-mark-read] provider call failed (non-fatal):", (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[uazapi-mark-read] error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
