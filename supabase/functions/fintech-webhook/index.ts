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
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") || "unknown";
    const token = url.searchParams.get("token");
    const tenantIdParam = url.searchParams.get("tenant");

    const body = await req.text();
    let payload: any = {};
    try {
      payload = JSON.parse(body);
    } catch {
      payload = { raw: body };
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Determine event type from common gateway patterns
    const eventType =
      payload.event || payload.type || payload.event_type || payload.action || "unknown";

    // Resolve tenant: prefer token-based lookup for security
    let servidorId: string | null = null;

    if (token) {
      const { data: resolved } = await supabase.rpc("resolve_tenant_by_webhook_token", { p_token: token });
      servidorId = resolved || null;
    }

    // Fallback to legacy query param
    if (!servidorId && tenantIdParam) {
      servidorId = tenantIdParam;
    }

    // Fallback to payload metadata
    if (!servidorId && payload.metadata?.tenant_id) {
      servidorId = payload.metadata.tenant_id;
    }

    // Last resort: find by provider integration
    if (!servidorId) {
      const { data: integration } = await supabase
        .from("fintech_integrations")
        .select("servidor_id")
        .eq("provider", provider)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      servidorId = integration?.servidor_id;
    }

    if (!servidorId) {
      return new Response(
        JSON.stringify({ error: "Tenant not identified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the webhook event
    await supabase.from("fintech_webhook_logs").insert({
      servidor_id: servidorId,
      provider,
      event_type: eventType,
      payload,
      status: "received",
      direction: "inbound",
      request_payload: payload,
    });

    // Process payment events (includes Eduzz-specific events)
    const isPaid =
      eventType === "payment.approved" ||
      eventType === "payment_approved" ||
      eventType === "checkout.session.completed" ||
      eventType === "order_paid" ||
      eventType === "invoice_paid" ||
      // Eduzz specific
      eventType === "eduzz.invoice_paid" ||
      eventType === "eduzz.sale_paid" ||
      eventType === "contract_sale" ||
      payload.trans_status === "1" || // Eduzz paid status
      payload.sale_status === "1" ||
      payload.status === "approved" ||
      payload.status === "paid";

    const isPending =
      eventType === "payment.pending" ||
      eventType === "eduzz.sale_waiting" ||
      eventType === "eduzz.invoice_waiting" ||
      payload.trans_status === "4" || // Eduzz waiting payment
      payload.sale_status === "4" ||
      payload.status === "pending" ||
      payload.status === "waiting_payment";

    const isFailed =
      eventType === "payment.refused" ||
      eventType === "payment_refused" ||
      eventType === "payment.failed" ||
      eventType === "eduzz.sale_refunded" ||
      eventType === "eduzz.invoice_refunded" ||
      payload.trans_status === "6" || // Eduzz refunded
      payload.sale_status === "6" ||
      payload.status === "refused" ||
      payload.status === "failed" ||
      payload.status === "refunded";

    const isCancelled =
      eventType === "subscription.cancelled" ||
      eventType === "subscription_cancelled" ||
      eventType === "customer.subscription.deleted" ||
      eventType === "eduzz.subscription_cancelled" ||
      payload.trans_status === "7" || // Eduzz cancelled
      payload.sale_status === "7";

    if (isPaid || isPending || isFailed || isCancelled) {
      // Eduzz-specific reference fields
      const reference =
        payload.order_id ||
        payload.trans_cod ||
        payload.sale_id ||
        payload.invoice_code ||
        payload.transaction_id ||
        payload.data?.object?.id ||
        payload.reference;

      if (reference) {
        const newStatus = isPaid ? "pago" : isPending ? "pendente" : isFailed ? "vencido" : "cancelado";

        const { data: tx } = await supabase
          .from("financial_transactions")
          .update({
            status: newStatus,
            ...(isPaid ? { paid_at: new Date().toISOString() } : {}),
          })
          .eq("reference", String(reference))
          .eq("servidor_id", servidorId)
          .select("id, registration_id")
          .maybeSingle();

        if (tx?.registration_id) {
          const clientStatus = isPaid ? "ativo" : isPending ? "pendente" : isFailed ? "inadimplente" : "cancelado";
          await supabase
            .from("crm_client_registrations")
            .update({ client_status: clientStatus })
            .eq("id", tx.registration_id);
        }
      }

      // Update log to processed
      await supabase
        .from("fintech_webhook_logs")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .eq("servidor_id", servidorId)
        .eq("provider", provider)
        .eq("event_type", eventType)
        .order("created_at", { ascending: false })
        .limit(1);

      // Update last_event_at on integration
      await supabase
        .from("fintech_integrations")
        .update({ last_event_at: new Date().toISOString() })
        .eq("servidor_id", servidorId)
        .eq("provider", provider);
    }

    return new Response(
      JSON.stringify({ received: true, event: eventType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Fintech webhook error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
