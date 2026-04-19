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

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id, action } = await req.json();

    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "connect") {
      // Create or update session record
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .upsert(
          { company_id, status: "connecting" },
          { onConflict: "company_id" }
        )
        .select()
        .single();

      if (error) throw error;

      // TODO: Call external microservice to initiate WhatsApp connection
      // const microserviceUrl = Deno.env.get("WHATSAPP_SERVICE_URL");
      // const qrResponse = await fetch(`${microserviceUrl}/connect`, { ... });

      return new Response(
        JSON.stringify({
          success: true,
          session: data,
          message: "Connection initiated. Configure WHATSAPP_SERVICE_URL to connect to your microservice.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "disconnect") {
      const { error } = await supabase
        .from("whatsapp_sessions")
        .update({ status: "disconnected", phone_number: null })
        .eq("company_id", company_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Disconnected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "status") {
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("company_id", company_id)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({ session: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: connect, disconnect, status" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
