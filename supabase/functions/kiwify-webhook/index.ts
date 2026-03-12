import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Validate Kiwify token
    const token = req.headers.get("x-kiwify-token") || req.headers.get("X-Kiwify-Token");
    const expectedToken = Deno.env.get("KIWIFY_TOKEN");

    if (!expectedToken) {
      console.error("KIWIFY_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (token !== expectedToken) {
      console.error("Invalid token received:", token);
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("Kiwify webhook received:", JSON.stringify(payload));

    // Initialize Supabase with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract data from Kiwify payload
    const orderId = payload.order_id || payload.Transaction?.order_id || payload.id;
    const status = payload.order_status || payload.status || "unknown";
    const paymentMethod = payload.payment_method || payload.Transaction?.payment_method || null;
    const productName = payload.product_name || payload.Product?.name || null;
    const amount = payload.Commissions?.charge_amount || payload.amount || null;
    const customerEmail = payload.Customer?.email || payload.customer_email || null;
    const customerName = payload.Customer?.full_name || payload.customer_name || null;

    // Map Kiwify status to internal status
    let internalStatus = "pending";
    switch (status) {
      case "paid":
      case "approved":
        internalStatus = "paid";
        break;
      case "refunded":
        internalStatus = "refunded";
        break;
      case "chargedback":
      case "chargeback":
        internalStatus = "chargeback";
        break;
      case "waiting_payment":
      case "billet_printed":
        internalStatus = "waiting";
        break;
      default:
        internalStatus = status;
    }

    // Upsert payment record
    const { error: paymentError } = await supabase
      .from("payments")
      .upsert(
        {
          kiwify_order_id: orderId,
          produto: productName,
          forma_pagamento: paymentMethod,
          status: internalStatus,
          valor: amount ? parseFloat(String(amount)) / 100 : null,
          customer_email: customerEmail,
          customer_name: customerName,
          raw_payload: payload,
        },
        { onConflict: "kiwify_order_id" }
      );

    if (paymentError) {
      console.error("Error saving payment:", paymentError);
      return new Response(JSON.stringify({ error: "Error saving payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If payment approved and we have customer email, try to activate company
    if (internalStatus === "paid" && customerEmail) {
      const { data: companies } = await supabase
        .from("companies")
        .select("id")
        .eq("email", customerEmail)
        .eq("status", "inactive");

      if (companies && companies.length > 0) {
        for (const company of companies) {
          await supabase
            .from("companies")
            .update({ status: "active" })
            .eq("id", company.id);

          // Link payment to company
          await supabase
            .from("payments")
            .update({ company_id: company.id })
            .eq("kiwify_order_id", orderId);
        }
        console.log(`Activated ${companies.length} companies for ${customerEmail}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
