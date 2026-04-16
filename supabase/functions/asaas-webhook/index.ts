import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ═══════════════════════════════════════════════════════════════
   ASAAS WEBHOOK — Processamento focado na aba Fintech do ACCORD
   ═══════════════════════════════════════════════════════════════ */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

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
  PAYMENT_UPDATED: "PENDING",
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

/* ── Upsert tenant_invoices from payment data ── */
async function syncTenantInvoice(
  supabaseAdmin: any,
  tenantId: string,
  paymentData: any,
  newStatus: string
) {
  if (!paymentData?.id) return;

  const asaasPaymentId = paymentData.id;

  const invoiceData: any = {
    tenant_id: tenantId,
    asaas_payment_id: asaasPaymentId,
    status: newStatus,
    last_status_sync_at: new Date().toISOString(),
    raw_asaas_payload: paymentData,
  };

  if (paymentData.value) invoiceData.amount = paymentData.value;
  if (paymentData.dueDate) invoiceData.due_date = paymentData.dueDate;
  if (paymentData.billingType) {
    invoiceData.billing_type = paymentData.billingType;
    const labels: Record<string, string> = {
      PIX: "PIX", BOLETO: "Boleto", CREDIT_CARD: "Cartão de Crédito",
      DEBIT_CARD: "Cartão de Débito", TRANSFER: "Transferência", UNDEFINED: "Não definido",
    };
    invoiceData.payment_method_label = labels[paymentData.billingType] || paymentData.billingType;
  }
  if (paymentData.invoiceUrl) invoiceData.invoice_url = paymentData.invoiceUrl;
  if (paymentData.bankSlipUrl) invoiceData.bank_slip_url = paymentData.bankSlipUrl;
  if (paymentData.nossoNumero) invoiceData.identification_field = paymentData.nossoNumero;
  if (paymentData.barCode) invoiceData.bar_code = paymentData.barCode;
  if (paymentData.invoiceNumber) invoiceData.invoice_number = paymentData.invoiceNumber;
  if (paymentData.externalReference) invoiceData.external_reference = paymentData.externalReference;
  if (paymentData.customer) invoiceData.asaas_customer_id = paymentData.customer;

  // PIX data
  if (paymentData.pix) {
    if (paymentData.pix.payload) invoiceData.pix_payload = paymentData.pix.payload;
    if (paymentData.pix.qrCode) invoiceData.pix_qrcode_url = paymentData.pix.qrCode;
  }

  // Paid date
  if (paymentData.paymentDate && ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(newStatus)) {
    invoiceData.paid_at = paymentData.paymentDate;
  }

  // Check if invoice exists
  const { data: existing } = await supabaseAdmin
    .from("tenant_invoices")
    .select("id")
    .eq("asaas_payment_id", asaasPaymentId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("tenant_invoices")
      .update(invoiceData)
      .eq("id", existing.id);
  } else {
    invoiceData.is_current = true;
    await supabaseAdmin
      .from("tenant_invoices")
      .insert(invoiceData);
  }
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

    const { data: integration } = await supabaseAdmin
      .from("tenant_fintech_integrations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("provider", "asaas")
      .maybeSingle();

    if (!integration) {
      return json({ error: "Integration not found" }, 404);
    }

    const accessToken = req.headers.get("asaas-access-token");
    if ((integration as any).webhook_auth_token && accessToken !== (integration as any).webhook_auth_token) {
      return json({ error: "Invalid auth token" }, 401);
    }

    const payload = await req.json();
    const eventType = payload.event || "unknown";
    const eventId = payload.id || null;
    const isProcessedEvent = ALL_PROCESSED_EVENTS.has(eventType);

    // Idempotency
    if (eventId) {
      const { data: existing } = await supabaseAdmin
        .from("tenant_asaas_webhook_events")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("event_id", eventId)
        .maybeSingle();
      if (existing) return json({ received: true, duplicate: true });
    }

    // Store raw event
    await supabaseAdmin.from("tenant_asaas_webhook_events").insert({
      tenant_id: tenantId,
      event_id: eventId,
      event_type: eventType,
      asaas_payment_id: (payload.payment?.id || payload.subscription?.id || payload.checkout?.id || null),
      payload,
      processed: !isProcessedEvent,
      processed_at: !isProcessedEvent ? new Date().toISOString() : null,
      processing_status: isProcessedEvent ? "pending" : "ignored",
    } as any);

    if (!isProcessedEvent) {
      await supabaseAdmin
        .from("tenant_fintech_integrations")
        .update({ last_webhook_event: eventType, last_webhook_received_at: new Date().toISOString() } as any)
        .eq("tenant_id", tenantId)
        .eq("provider", "asaas");
      return json({ received: true, processed: false, reason: "event_not_in_scope" });
    }

    /* ── PAYMENT STATUS EVENTS ── */
    const paymentData = payload.payment || {};
    const asaasPaymentId = paymentData.id || null;

    if (PAYMENT_STATUS_MAP[eventType] && asaasPaymentId) {
      const newStatus = PAYMENT_STATUS_MAP[eventType];
      const updateData: any = { status: newStatus, raw_payload: paymentData };
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

      // Sync to tenant_invoices
      await syncTenantInvoice(supabaseAdmin, tenantId, paymentData, newStatus);
    }

    /* ── PAYMENT VIEW EVENTS ── */
    if (PAYMENT_VIEW_EVENTS.has(eventType) && asaasPaymentId) {
      const viewField = eventType === "PAYMENT_BANK_SLIP_VIEWED" ? "boleto_viewed_at" : "checkout_viewed_at";
      await supabaseAdmin
        .from("tenant_asaas_payments")
        .update({ [viewField]: new Date().toISOString() } as any)
        .eq("tenant_id", tenantId)
        .eq("asaas_payment_id", asaasPaymentId);
    }

    /* ── SUBSCRIPTION EVENTS ── */
    if (SUBSCRIPTION_EVENTS[eventType]) {
      const subData = payload.subscription || {};
      const asaasSubId = subData.id || null;
      if (asaasSubId) {
        const subUpdate: any = { status: SUBSCRIPTION_EVENTS[eventType], raw_payload: subData };
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

    /* ── MARK EVENT AS PROCESSED ── */
    if (eventId) {
      await supabaseAdmin
        .from("tenant_asaas_webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString(), processing_status: "processed" } as any)
        .eq("tenant_id", tenantId)
        .eq("event_id", eventId);
    }

    await supabaseAdmin
      .from("tenant_fintech_integrations")
      .update({ last_webhook_event: eventType, last_webhook_received_at: new Date().toISOString() } as any)
      .eq("tenant_id", tenantId)
      .eq("provider", "asaas");

    return json({ received: true, processed: true, event: eventType });
  } catch (e) {
    console.error("asaas-webhook error:", e);
    return json({ received: true, processed: false, error: "internal_processing_error" });
  }
});
