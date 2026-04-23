import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const body = await req.json();
    const { integration_id, endpoint, method = "POST", payload, servidor_id } = body;

    if (!integration_id || !endpoint || !servidor_id) {
      return new Response(
        JSON.stringify({ error: "integration_id, endpoint, and servidor_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch integration credentials using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: integration } = await adminClient
      .from("fintech_integrations")
      .select("*")
      .eq("id", integration_id)
      .eq("servidor_id", servidor_id)
      .single();

    if (!integration) {
      return new Response(
        JSON.stringify({ error: "Integration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build headers for external API call
    const externalHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (integration.api_key_encrypted) {
      externalHeaders["Authorization"] = `Bearer ${integration.api_key_encrypted}`;
    }

    // Make the external API call
    let statusCode = 0;
    let responsePayload: any = null;
    let success = false;
    let errorMessage: string | null = null;

    try {
      const finalUrl = integration.base_url
        ? `${integration.base_url.replace(/\/$/, "")}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`
        : endpoint;

      const response = await fetch(finalUrl, {
        method: method.toUpperCase(),
        headers: externalHeaders,
        body: method.toUpperCase() !== "GET" ? JSON.stringify(payload || {}) : undefined,
      });

      statusCode = response.status;
      try {
        responsePayload = await response.json();
      } catch {
        responsePayload = { raw: await response.text() };
      }

      success = response.ok;
      if (!response.ok) {
        errorMessage = `HTTP ${statusCode}: ${JSON.stringify(responsePayload)}`;
      }
    } catch (err: any) {
      errorMessage = err.message || "Network error";
      statusCode = 0;
    }

    // Log the outbound call
    await adminClient.from("fintech_webhook_logs").insert({
      servidor_id,
      provider: integration.provider,
      event_type: "outbound_api_call",
      direction: "outbound",
      endpoint,
      request_payload: payload || {},
      response_payload: responsePayload,
      status_code: statusCode,
      status: success ? "processed" : "error",
      error_message: errorMessage,
      payload: payload || {},
    });

    return new Response(
      JSON.stringify({
        success,
        status_code: statusCode,
        response: responsePayload,
        error: errorMessage,
      }),
      {
        status: success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("Outbound integration error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
