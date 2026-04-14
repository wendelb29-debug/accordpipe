import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ═══════════════════════════════════════════════════════════════
   ASAAS WEBHOOK — Processamento focado na aba Fintech do ACCORD
   ═══════════════════════════════════════════════════════════════ */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

/* ── Eventos processados nesta fase ── */
const PAYMENT_STATUS_MAP: Record<string, string> = {
  PAYMENT_CREATED: "PENDING",
  PAYMENT_CONFIRMED: "CONFIRMED",
  PAYMENT_RECEIVED: "RECEIVED",
  PAYMENT_OVERDUE: "OVERDUE",
  PAYMENT_REFUNDED: "REFUNDED",
  PAYMENT_REFUND_IN_PROGRESS: "REFUND_IN_PROGRESS",
  PAYMENT_PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  PAYMENT_DELETED: "DELETED",
  PAYMENT_RESTORED: "RESTORED",
  PAYMENT_BANK_SLIP_CANCELLED: "CANCELLED",
  PAYMENT_UPDATED: "PENDING", // updated mantém pendente; raw_payload terá dados atualizados
};

const PAYMENT_VIEW_EVENTS = new Set([
  "PAYMENT_BANK_SLIP_VIEWED",
  "PAYMENT_CHECKOUT_VIEWED",
]);

const SUBSCRIPTION_EVENTS: Record<string, string> = {
  SUBSCRIPTION_CREATED: "ACTIVE",
  SUBSCRIPTION_UPDATED: "ACTIVE",
  SUBSCRIPTION_INACTIVATED: "INACTIVE",
  SUBSCRIPTION_DELETED: "DELETED",
};

const CHECKOUT_EVENTS: Record<string, string> = {
  CHECKOUT_CREATED: "CREATED",
  CHECKOUT_EXPIRED: "EXPIRED",
  CHECKOUT_CANCELED: "CANCELED",
  CHECKOUT_PAID: "PAID",
};

const ALL_PROCESSED_EVENTS = new Set([
  ...Object.keys(PAYMENT_STATUS_MAP),
  ...PAYMENT_VIEW_EVENTS,
  ...Object.keys(SUBSCRIPTION_EVENTS),
  ...Object.keys(CHECKOUT_EVENTS),
]);

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(null);

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant");

    if (!tenantId) {
      return json({ error: "tenant required" }, 400);
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
      return json({ error: "Integration not found" }, 404);
    }

    // Validate auth token
    const accessToken = req.headers.get("asaas-access-token");
    if ((integration as any).webhook_auth_token && accessToken !== (integration as any).webhook_auth_token) {
      return json({ error: "Invalid auth token" }, 401);
    }

    const payload = await req.json();
    const eventType = payload.event || "unknown";
    const eventId = payload.id || null;

    const isProcessedEvent = ALL_PROCESSED_EVENTS.has(eventType);

    // Idempotency check
    if (eventId) {
      const { data: existing } = await supabaseAdmin
        .from("tenant_asaas_webhook_events")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("event_id", eventId)
        .maybeSingle();

      if (existing) {
        return json({ received: true, duplicate: true });
      }
    }

    // Store raw event (always — regardless of whether we process it)
    await supabaseAdmin.from("tenant_asaas_webhook_events").insert({
      tenant_id: tenantId,
      event_id: eventId,
      event_type: eventType,
      asaas_payment_id: (payload.payment?.id || payload.subscription?.id || payload.checkout?.id || null),
      payload,
      processed: !isProcessedEvent, // ignored events are marked processed immediately
      processed_at: !isProcessedEvent ? new Date().toISOString() : null,
      processing_status: isProcessedEvent ? "pending" : "ignored",
    } as any);

    /* ══════════════════════════════════════
       IGNORED EVENTS — respond 200 immediately
       ══════════════════════════════════════ */
    if (!isProcessedEvent) {
      // Still update "last event" timestamp for observability
      await supabaseAdmin
        .from("tenant_fintech_integrations")
        .update({
          last_webhook_event: eventType,
          last_webhook_received_at: new Date().toISOString(),
        } as any)
        .eq("tenant_id", tenantId)
        .eq("provider", "asaas");

      return json({ received: true, processed: false, reason: "event_not_in_scope" });
    }

    /* ══════════════════════════════════════
       PAYMENT STATUS EVENTS
       ══════════════════════════════════════ */
    const paymentData = payload.payment || {};
    const asaasPaymentId = paymentData.id || null;

    if (PAYMENT_STATUS_MAP[eventType] && asaasPaymentId) {
      const newStatus = PAYMENT_STATUS_MAP[eventType];
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

    /* ══════════════════════════════════════
       PAYMENT VIEW EVENTS (boleto viewed, checkout viewed)
       ══════════════════════════════════════ */
    if (PAYMENT_VIEW_EVENTS.has(eventType) && asaasPaymentId) {
      const viewField = eventType === "PAYMENT_BANK_SLIP_VIEWED" ? "boleto_viewed_at" : "checkout_viewed_at";
      await supabaseAdmin
        .from("tenant_asaas_payments")
        .update({ [viewField]: new Date().toISOString() } as any)
        .eq("tenant_id", tenantId)
        .eq("asaas_payment_id", asaasPaymentId);
    }

    /* ══════════════════════════════════════
       SUBSCRIPTION EVENTS
       ══════════════════════════════════════ */
    if (SUBSCRIPTION_EVENTS[eventType]) {
      const subData = payload.subscription || {};
      const asaasSubId = subData.id || null;
      if (asaasSubId) {
        const subUpdate: any = {
          status: SUBSCRIPTION_EVENTS[eventType],
          raw_payload: subData,
        };
        if (subData.value) subUpdate.value = subData.value;
        if (subData.cycle) subUpdate.cycle = subData.cycle;
        if (subData.nextDueDate) subUpdate.next_due_date = subData.nextDueDate;
        if (subData.endDate) subUpdate.end_date = subData.endDate;

        await supabaseAdmin
          .from("tenant_asaas_subscriptions")
          .update(subUpdate)
          .eq("tenant_id", tenantId)
          .eq("asaas_subscription_id", asaasSubId);
      }
    }

    /* ══════════════════════════════════════
       CHECKOUT / PAYMENT LINK EVENTS
       — Log only for now; no dedicated table yet
       ══════════════════════════════════════ */
    // Checkout events are stored in the raw webhook log above.
    // Future: create tenant_asaas_checkouts table when needed.

    /* ══════════════════════════════════════
       MARK EVENT AS PROCESSED
       ══════════════════════════════════════ */
    if (eventId) {
      await supabaseAdmin
        .from("tenant_asaas_webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString(), processing_status: "processed" } as any)
        .eq("tenant_id", tenantId)
        .eq("event_id", eventId);
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

    return json({ received: true, processed: true, event: eventType });
  } catch (e) {
    console.error("asaas-webhook error:", e);
    // Always return 200 to avoid Asaas retrying indefinitely on processing errors
    return json({ received: true, processed: false, error: "internal_processing_error" });
  }
});
