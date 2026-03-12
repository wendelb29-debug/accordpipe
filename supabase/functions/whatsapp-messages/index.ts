import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const contactId = url.searchParams.get("contact_id");
      const companyId = url.searchParams.get("company_id");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      if (!contactId || !companyId) {
        return new Response(
          JSON.stringify({ error: "contact_id and company_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("contact_id", contactId)
        .eq("company_id", companyId)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) throw error;

      return new Response(
        JSON.stringify({ messages: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const { company_id, contact_id, phone, message, message_type = "text" } = await req.json();

      if (!company_id || !contact_id || !phone || !message) {
        return new Response(
          JSON.stringify({ error: "company_id, contact_id, phone, and message are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save outbound message to database
      const { data: msgData, error: msgError } = await supabase
        .from("whatsapp_messages")
        .insert({
          company_id,
          contact_id,
          phone,
          message,
          direction: "outbound",
          status: "pending",
          message_type,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Update contact's last message
      await supabase
        .from("whatsapp_contacts")
        .update({
          last_message: message,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", contact_id);

      // TODO: Forward to microservice for actual delivery
      // const microserviceUrl = Deno.env.get("WHATSAPP_SERVICE_URL");
      // await fetch(`${microserviceUrl}/send`, { body: JSON.stringify({ phone, message }) });

      return new Response(
        JSON.stringify({ success: true, message: msgData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
