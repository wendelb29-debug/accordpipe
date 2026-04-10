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

    // Verify user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, servidor_id, ...params } = body;

    if (!action || !servidor_id) {
      return new Response(
        JSON.stringify({ error: "action and servidor_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Eduzz integration credentials using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: integration } = await adminClient
      .from("fintech_integrations")
      .select("*")
      .eq("servidor_id", servidor_id)
      .ilike("provider", "%eduzz%")
      .eq("is_active", true)
      .maybeSingle();

    if (!integration) {
      return new Response(
        JSON.stringify({ error: "Eduzz integration not found or inactive for this tenant" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = integration.api_key_encrypted;
    const publicKey = integration.public_key;
    const baseUrl = integration.base_url || "https://api2.eduzz.com";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Eduzz API key not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };

    if (publicKey) {
      headers["X-Public-Key"] = publicKey;
    }

    let result: any = null;
    let endpoint = "";
    let method = "GET";
    let requestBody: any = undefined;

    switch (action) {
      case "list_products": {
        endpoint = "/content/get_content_list";
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.set("page", String(params.page));
        if (params.per_page) queryParams.set("per_page", String(params.per_page || 50));
        endpoint += `?${queryParams.toString()}`;
        break;
      }

      case "get_product": {
        if (!params.product_id) {
          return new Response(
            JSON.stringify({ error: "product_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        endpoint = `/content/get_content/${params.product_id}`;
        break;
      }

      case "list_sales": {
        endpoint = "/sale/get_sale_list";
        const salesParams = new URLSearchParams();
        if (params.start_date) salesParams.set("start_date", params.start_date);
        if (params.end_date) salesParams.set("end_date", params.end_date);
        if (params.page) salesParams.set("page", String(params.page));
        if (params.status) salesParams.set("sale_status", String(params.status));
        endpoint += `?${salesParams.toString()}`;
        break;
      }

      case "get_checkout_link": {
        // Build checkout link for a product
        if (!params.product_id) {
          return new Response(
            JSON.stringify({ error: "product_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Eduzz checkout links follow pattern: https://sun.eduzz.com/product_id
        result = {
          checkout_url: `https://sun.eduzz.com/${params.product_id}`,
          product_id: params.product_id,
        };
        // Log outbound
        await adminClient.from("fintech_webhook_logs").insert({
          servidor_id,
          provider: "eduzz",
          event_type: "get_checkout_link",
          direction: "outbound",
          endpoint: "checkout_link",
          request_payload: params,
          response_payload: result,
          status_code: 200,
          status: "processed",
          payload: params,
        });
        return new Response(JSON.stringify({ success: true, data: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_invoice": {
        endpoint = "/sale/create_invoice";
        method = "POST";
        requestBody = {
          content_id: params.product_id,
          customer_email: params.customer_email,
          customer_name: params.customer_name,
          due_date: params.due_date,
          payment_method: params.payment_method || "pix",
          value: params.amount,
          description: params.description,
        };
        break;
      }

      case "get_subscriptions": {
        endpoint = "/subscription/get_subscription_list";
        const subParams = new URLSearchParams();
        if (params.page) subParams.set("page", String(params.page));
        if (params.status) subParams.set("status", String(params.status));
        endpoint += `?${subParams.toString()}`;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Make the API call
    const finalUrl = `${baseUrl.replace(/\/$/, "")}${endpoint}`;
    let statusCode = 0;
    let responsePayload: any = null;
    let success = false;
    let errorMessage: string | null = null;

    try {
      const fetchOptions: RequestInit = { method, headers };
      if (method !== "GET" && requestBody) {
        fetchOptions.body = JSON.stringify(requestBody);
      }

      const response = await fetch(finalUrl, fetchOptions);
      statusCode = response.status;

      try {
        responsePayload = await response.json();
      } catch {
        const text = await response.text();
        responsePayload = { raw: text };
      }

      success = response.ok;
      if (!response.ok) {
        errorMessage = `HTTP ${statusCode}: ${JSON.stringify(responsePayload)}`;
      }
    } catch (err: any) {
      errorMessage = err.message || "Network error";
    }

    // Log the call
    await adminClient.from("fintech_webhook_logs").insert({
      servidor_id,
      provider: "eduzz",
      event_type: `eduzz_${action}`,
      direction: "outbound",
      endpoint,
      request_payload: requestBody || params,
      response_payload: responsePayload,
      status_code: statusCode,
      status: success ? "processed" : "error",
      error_message: errorMessage,
      payload: requestBody || params,
    });

    return new Response(
      JSON.stringify({
        success,
        data: responsePayload,
        error: errorMessage,
      }),
      {
        status: success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("Eduzz API error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
