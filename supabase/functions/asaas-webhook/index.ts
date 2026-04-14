import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant");

    if (!tenantId) {
      return new Response(JSON.stringify({ error: "tenant required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find integration
    const { data: integration } = await supabaseAdmin
      .from("tenant_fintech_integrations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("provider", "asaas")
      .maybeSingle();

    if (!integration) {
      return new Response(JSON.stringify({ error: "Integration not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate auth token
    const accessToken = req.headers.get("asaas-access-token");
    if ((integration as any).webhook_auth_token && accessToken !== (integration as any).webhook_auth_token) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = await req.json();
    const eventType = payload.event || "unknown";
    const paymentData = payload.payment || {};
    const asaasPaymentId = paymentData.id || null;
    const eventId = payload.id || null;

    // Idempotency check
    if (eventId) {
      const { data: existing } = await supabaseAdmin
        .from("tenant_asaas_webhook_events")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("event_id", eventId)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Store event
    await supabaseAdmin.from("tenant_asaas_webhook_events").insert({
      tenant_id: tenantId,
      event_id: eventId,
      event_type: eventType,
      asaas_payment_id: asaasPaymentId,
      payload,
    } as any);

    // Process payment events
    if (asaasPaymentId) {
      const statusMap: Record<string, string> = {
        PAYMENT_CREATED: "PENDING",
        PAYMENT_PENDING: "PENDING",
        PAYMENT_CONFIRMED: "CONFIRMED",
        PAYMENT_RECEIVED: "RECEIVED",
        PAYMENT_OVERDUE: "OVERDUE",
        PAYMENT_DELETED: "DELETED",
        PAYMENT_REFUNDED: "REFUNDED",
        PAYMENT_ANTICIPATED: "ANTICIPATED",
        PAYMENT_RESTORED: "RESTORED",
        PAYMENT_APPROVED_BY_RISK_ANALYSIS: "CONFIRMED",
        PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: "REFUSED",
        PAYMENT_CHARGEBACK_REQUESTED: "CHARGEBACK",
        PAYMENT_DUNNING_RECEIVED: "RECEIVED",
      };

      const newStatus = statusMap[eventType];
      if (newStatus) {
        const updateData: any = {
          status: newStatus,
          raw_payload: paymentData,
        };
        if (paymentData.paymentDate) updateData.payment_date = paymentData.paymentDate;
        if (paymentData.value) updateData.value = paymentData.value;
        if (paymentData.netValue) updateData.net_value = paymentData.netValue;
        if (paymentData.invoiceUrl) updateData.invoice_url = paymentData.invoiceUrl;
        if (paymentData.bankSlipUrl) updateData.bank_slip_url = paymentData.bankSlipUrl;

        await supabaseAdmin
          .from("tenant_asaas_payments")
          .update(updateData)
          .eq("tenant_id", tenantId)
          .eq("asaas_payment_id", asaasPaymentId);
      }

      // Mark event processed
      if (eventId) {
        await supabaseAdmin
          .from("tenant_asaas_webhook_events")
          .update({ processed: true, processed_at: new Date().toISOString() } as any)
          .eq("tenant_id", tenantId)
          .eq("event_id", eventId);
      }
    }

    // Update integration last event
    await supabaseAdmin
      .from("tenant_fintech_integrations")
      .update({
        last_webhook_event: eventType,
        last_webhook_received_at: new Date().toISOString(),
      } as any)
      .eq("tenant_id", tenantId)
      .eq("provider", "asaas");

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("asaas-webhook error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
