import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_URLS: Record<string, string> = {
  sandbox: "https://sandbox.asaas.com/api/v3",
  production: "https://api.asaas.com/api/v3",
};

function maskApiKey(key: string): string {
  if (key.length <= 10) return "****";
  return key.substring(0, 10) + "****";
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsErr } = await supabaseAdmin.auth.getUser(token);
      if (!claimsErr && claims?.user) userId = claims.user.id;
    }

    const body = await req.json();
    const { action, tenant_id } = body;

    if (!tenant_id) return json({ error: "tenant_id required" }, 400);

    async function getIntegration() {
      const { data } = await supabaseAdmin
        .from("tenant_fintech_integrations")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("provider", "asaas")
        .maybeSingle();
      return data as any;
    }

    async function callAsaas(method: string, path: string, apiKey: string, env: string, payload?: any) {
      const base = ASAAS_URLS[env] || ASAAS_URLS.sandbox;
      const res = await fetch(`${base}${path}`, {
        method,
        headers: { "Content-Type": "application/json", "access_token": apiKey },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    }

    async function ensureCustomer(apiKey: string, env: string, localId: string, name: string, email?: string, cpfCnpj?: string, phone?: string) {
      const { data: existing } = await supabaseAdmin
        .from("tenant_asaas_customers")
        .select("asaas_customer_id")
        .eq("tenant_id", tenant_id)
        .eq("local_customer_id", localId)
        .maybeSingle();
      if (existing) return (existing as any).asaas_customer_id;

      const result = await callAsaas("POST", "/customers", apiKey, env, {
        name, email, cpfCnpj, phone, externalReference: localId,
      });
      if (!result.ok) throw new Error(result.data?.errors?.[0]?.description || "Erro ao criar cliente no Asaas");

      await supabaseAdmin.from("tenant_asaas_customers").insert({
        tenant_id, local_customer_id: localId, asaas_customer_id: result.data.id,
        name, email, cpf_cnpj: cpfCnpj, phone,
      } as any);
      return result.data.id;
    }

    async function auditLog(actionName: string, targetId?: string, details?: any) {
      if (!userId) return;
      await supabaseAdmin.rpc("log_audit", {
        _user_id: userId, _user_name: "system", _action: actionName,
        _target_type: "fintech_asaas", _target_id: targetId || tenant_id,
        _details: { module: "fintech_asaas", ...details }, _servidor_id: tenant_id,
      });
    }

    /* ──────── SAVE CREDENTIALS ──────── */
    if (action === "save_credentials") {
      const { api_key, environment } = body;
      if (!api_key) return json({ error: "api_key required" }, 400);

      const masked = maskApiKey(api_key);
      const existing = await getIntegration();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const webhookUrl = `${supabaseUrl}/functions/v1/asaas-webhook?tenant=${tenant_id}`;

      if (existing) {
        await supabaseAdmin.from("tenant_fintech_integrations")
          .update({ api_key_encrypted: api_key, api_key_masked: masked, environment: environment || "sandbox", webhook_url: webhookUrl, updated_by: userId } as any)
          .eq("id", existing.id);
      } else {
        const token = crypto.randomUUID();
        await supabaseAdmin.from("tenant_fintech_integrations")
          .insert({ tenant_id, provider: "asaas", environment: environment || "sandbox", api_key_encrypted: api_key, api_key_masked: masked, webhook_url: webhookUrl, webhook_auth_token: token, created_by: userId, updated_by: userId } as any);
      }
      await auditLog(existing ? "asaas_credentials_updated" : "asaas_integration_created", tenant_id, { environment: environment || "sandbox" });
      return json({ success: true });
    }

    /* ──────── TEST CONNECTION ──────── */
    if (action === "test_connection") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) return json({ error: "Credenciais não configuradas" }, 400);
      const { ok, data } = await callAsaas("GET", "/finance/balance", integration.api_key_encrypted, integration.environment);
      const newStatus = ok ? "connected" : "error";
      await supabaseAdmin.from("tenant_fintech_integrations")
        .update({ connection_status: newStatus, last_connection_check_at: new Date().toISOString(), last_connection_error: ok ? null : (data?.errors?.[0]?.description || "Falha na conexão") } as any)
        .eq("id", integration.id);
      await auditLog("asaas_connection_tested", tenant_id, { status: newStatus });
      return json({ status: newStatus, balance: ok ? data : null });
    }

    /* ──────── GENERATE WEBHOOK TOKEN ──────── */
    if (action === "generate_webhook_token") {
      let integration = await getIntegration();
      const newToken = crypto.randomUUID();
      if (!integration) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const webhookUrl = `${supabaseUrl}/functions/v1/asaas-webhook?tenant=${tenant_id}`;
        await supabaseAdmin.from("tenant_fintech_integrations")
          .insert({ tenant_id, provider: "asaas", environment: "sandbox", api_key_encrypted: "", api_key_masked: "", webhook_url: webhookUrl, webhook_auth_token: newToken, created_by: userId, updated_by: userId } as any);
      } else {
        await supabaseAdmin.from("tenant_fintech_integrations")
          .update({ webhook_auth_token: newToken, updated_by: userId } as any)
          .eq("id", integration.id);
      }
      return json({ success: true, token: newToken });
    }

    /* ──────── CREATE/UPDATE WEBHOOK ──────── */
    if (action === "create_webhook") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) return json({ error: "Credenciais não configuradas" }, 400);
      const webhookPayload = {
        name: `ACCORD Webhook - ${tenant_id.substring(0, 8)}`,
        url: integration.webhook_url, email: "", enabled: true, interrupted: false, apiVersion: 3,
        authToken: integration.webhook_auth_token || "",
        sendType: "SEQUENTIALLY",
        events: [
          "PAYMENT_CREATED", "PAYMENT_AWAITING_RISK_ANALYSIS", "PAYMENT_APPROVED_BY_RISK_ANALYSIS",
          "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
          "PAYMENT_ANTICIPATED", "PAYMENT_OVERDUE", "PAYMENT_DELETED",
          "PAYMENT_RESTORED", "PAYMENT_REFUNDED", "PAYMENT_RECEIVED_IN_CASH_UNDONE",
          "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE",
          "PAYMENT_AWAITING_CHARGEBACK_REVERSAL", "PAYMENT_DUNNING_RECEIVED",
          "PAYMENT_DUNNING_REQUESTED", "PAYMENT_BANK_SLIP_VIEWED", "PAYMENT_CHECKOUT_VIEWED",
        ],
      };
      let result;
      if (integration.webhook_remote_id) {
        result = await callAsaas("PUT", `/webhooks/${integration.webhook_remote_id}`, integration.api_key_encrypted, integration.environment, webhookPayload);
      } else {
        result = await callAsaas("POST", "/webhooks", integration.api_key_encrypted, integration.environment, webhookPayload);
      }
      if (result.ok) {
        await supabaseAdmin.from("tenant_fintech_integrations")
          .update({ webhook_remote_id: result.data.id || integration.webhook_remote_id, webhook_enabled: true, updated_by: userId } as any)
          .eq("id", integration.id);
        await auditLog(integration.webhook_remote_id ? "asaas_webhook_updated" : "asaas_webhook_created");
      }
      return json(result.ok ? { success: true } : { error: result.data?.errors?.[0]?.description || "Erro ao criar webhook" }, result.ok ? 200 : 400);
    }

    /* ──────── CREATE CUSTOMER ──────── */
    if (action === "create_customer") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) return json({ error: "Credenciais não configuradas" }, 400);
      const { local_customer_id, name, email, cpf_cnpj, phone } = body;
      const asaasId = await ensureCustomer(integration.api_key_encrypted, integration.environment, local_customer_id, name, email, cpf_cnpj, phone);
      return json({ asaas_customer_id: asaasId });
    }

    /* ──────── CREATE BILLING (BOLETO / PIX / UNDEFINED) ──────── */
    if (action === "create_billing") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) return json({ error: "Credenciais não configuradas" }, 400);

      const {
        asaas_customer_id, local_customer_id, value, due_date, description,
        fine_value, interest_value, discount_value, installment_count, installment_value,
        billing_type = "BOLETO", origin = "manual",
      } = body;

      const billingPayload: any = {
        customer: asaas_customer_id,
        billingType: billing_type,
        value,
        dueDate: due_date,
        description: description || "Cobrança gerada pelo ACCORD",
        externalReference: tenant_id,
      };

      if (fine_value) billingPayload.fine = { value: fine_value, type: "FIXED" };
      if (interest_value) billingPayload.interest = { value: interest_value, type: "PERCENTAGE" };
      if (discount_value) billingPayload.discount = { value: discount_value, type: "FIXED", dueDateLimitDays: 0 };
      if (installment_count && installment_count > 1) {
        billingPayload.installmentCount = installment_count;
        billingPayload.installmentValue = installment_value || (value / installment_count);
      }

      const result = await callAsaas("POST", "/payments", integration.api_key_encrypted, integration.environment, billingPayload);
      if (!result.ok) return json({ error: result.data?.errors?.[0]?.description || "Erro ao criar cobrança" }, 400);

      const payment = result.data;

      // Fetch boleto details if applicable
      let boletoDetails: any = {};
      if (billing_type === "BOLETO") {
        try {
          const idResult = await callAsaas("GET", `/payments/${payment.id}/identificationField`, integration.api_key_encrypted, integration.environment);
          if (idResult.ok) {
            boletoDetails = { identification_field: idResult.data.identificationField, bar_code: idResult.data.barCode, nosso_numero: idResult.data.nossoNumero };
          }
        } catch {}
      }

      // Fetch PIX QR Code if applicable
      let pixDetails: any = {};
      if (billing_type === "PIX") {
        try {
          const pixResult = await callAsaas("GET", `/payments/${payment.id}/pixQrCode`, integration.api_key_encrypted, integration.environment);
          if (pixResult.ok) {
            pixDetails = { pix_payload: pixResult.data.payload, pix_qrcode_url: pixResult.data.encodedImage, pix_expiration: pixResult.data.expirationDate };
          }
        } catch {}
      }

      await supabaseAdmin.from("tenant_asaas_payments").insert({
        tenant_id, local_customer_id, asaas_customer_id: asaas_customer_id,
        asaas_payment_id: payment.id, billing_type, status: payment.status,
        value: payment.value, net_value: payment.netValue, original_value: payment.originalValue,
        due_date: payment.dueDate, invoice_url: payment.invoiceUrl, bank_slip_url: payment.bankSlipUrl,
        description, external_reference: origin, raw_payload: payment,
        ...boletoDetails,
        ...(installment_count ? { installment_count, installment_value: installment_value || (value / installment_count), installment_id: payment.installment } : {}),
      } as any);

      await auditLog("asaas_billing_created", payment.id, { value, billing_type, origin });

      return json({
        success: true, payment_id: payment.id, status: payment.status,
        invoice_url: payment.invoiceUrl, bank_slip_url: payment.bankSlipUrl,
        due_date: payment.dueDate, ...boletoDetails, ...pixDetails,
      });
    }

    /* ──────── GET PIX QR CODE ──────── */
    if (action === "get_pix_qrcode") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) return json({ error: "Credenciais não configuradas" }, 400);
      const { asaas_payment_id } = body;
      const result = await callAsaas("GET", `/payments/${asaas_payment_id}/pixQrCode`, integration.api_key_encrypted, integration.environment);
      if (!result.ok) return json({ error: "QR Code não disponível" }, 400);
      return json({ success: true, payload: result.data.payload, qrcode_image: result.data.encodedImage, expiration: result.data.expirationDate });
    }

    /* ──────── CREATE PAYMENT LINK ──────── */
    if (action === "create_payment_link") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) return json({ error: "Credenciais não configuradas" }, 400);

      const { name, description: desc, value, billing_type = "UNDEFINED", charge_type = "DETACHED", max_installment_count, due_date, end_date, notification_enabled } = body;

      const linkPayload: any = {
        name: name || "Link de Pagamento ACCORD",
        description: desc || "",
        billingType: billing_type,
        chargeType: charge_type,
        value,
        dueDateLimitDays: 10,
        notificationEnabled: notification_enabled !== false,
      };
      if (max_installment_count) linkPayload.maxInstallmentCount = max_installment_count;
      if (end_date) linkPayload.endDate = end_date;

      const result = await callAsaas("POST", "/paymentLinks", integration.api_key_encrypted, integration.environment, linkPayload);
      if (!result.ok) return json({ error: result.data?.errors?.[0]?.description || "Erro ao criar link" }, 400);

      await auditLog("asaas_payment_link_created", result.data.id, { value, name });
      return json({ success: true, link: result.data });
    }

    /* ──────── CREATE SUBSCRIPTION ──────── */
    if (action === "create_subscription") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) return json({ error: "Credenciais não configuradas" }, 400);

      const { asaas_customer_id, local_customer_id, value, billing_type = "BOLETO", cycle = "MONTHLY", next_due_date, description: desc, end_date } = body;

      const subPayload: any = {
        customer: asaas_customer_id,
        billingType: billing_type,
        value,
        nextDueDate: next_due_date,
        cycle,
        description: desc || "Assinatura ACCORD",
        externalReference: tenant_id,
      };
      if (end_date) subPayload.endDate = end_date;

      const result = await callAsaas("POST", "/subscriptions", integration.api_key_encrypted, integration.environment, subPayload);
      if (!result.ok) return json({ error: result.data?.errors?.[0]?.description || "Erro ao criar assinatura" }, 400);

      await supabaseAdmin.from("tenant_asaas_subscriptions").insert({
        tenant_id, local_customer_id, asaas_customer_id,
        asaas_subscription_id: result.data.id, billing_type, cycle, value,
        next_due_date, end_date, status: result.data.status || "ACTIVE",
        description: desc, external_reference: tenant_id, raw_payload: result.data,
      } as any);

      await auditLog("asaas_subscription_created", result.data.id, { value, cycle, billing_type });

      return json({ success: true, subscription: result.data });
    }

    /* ──────── REFUND PAYMENT ──────── */
    if (action === "refund_payment") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) return json({ error: "Credenciais não configuradas" }, 400);
      const { asaas_payment_id, value: refundValue, description: refundDesc } = body;

      const refundPayload: any = {};
      if (refundValue) refundPayload.value = refundValue;
      if (refundDesc) refundPayload.description = refundDesc;

      const result = await callAsaas("POST", `/payments/${asaas_payment_id}/refund`, integration.api_key_encrypted, integration.environment, refundPayload);
      if (!result.ok) return json({ error: result.data?.errors?.[0]?.description || "Erro ao estornar" }, 400);

      await supabaseAdmin.from("tenant_asaas_payments")
        .update({ status: "REFUNDED", raw_payload: result.data } as any)
        .eq("tenant_id", tenant_id).eq("asaas_payment_id", asaas_payment_id);

      await auditLog("asaas_payment_refunded", asaas_payment_id, { value: refundValue });
      return json({ success: true });
    }

    /* ──────── CANCEL SUBSCRIPTION ──────── */
    if (action === "cancel_subscription") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) return json({ error: "Credenciais não configuradas" }, 400);
      const { asaas_subscription_id } = body;
      const result = await callAsaas("DELETE", `/subscriptions/${asaas_subscription_id}`, integration.api_key_encrypted, integration.environment);
      if (!result.ok) return json({ error: result.data?.errors?.[0]?.description || "Erro ao cancelar" }, 400);

      await supabaseAdmin.from("tenant_asaas_subscriptions")
        .update({ status: "CANCELLED" } as any)
        .eq("tenant_id", tenant_id).eq("asaas_subscription_id", asaas_subscription_id);

      await auditLog("asaas_subscription_cancelled", asaas_subscription_id);
      return json({ success: true });
    }

    /* ──────── LIST WALLET ──────── */
    if (action === "list_wallet") {
      const { status: filterStatus, period_start, period_end, customer_id, limit: lim } = body;
      let query = supabaseAdmin.from("tenant_asaas_payments").select("*")
        .eq("tenant_id", tenant_id).order("created_at", { ascending: false }).limit(lim || 50);
      if (filterStatus) query = query.eq("status", filterStatus);
      if (customer_id) query = query.eq("local_customer_id", customer_id);
      if (period_start) query = query.gte("due_date", period_start);
      if (period_end) query = query.lte("due_date", period_end);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json({ payments: data });
    }

    /* ──────── SYNC PAYMENT ──────── */
    if (action === "sync_payment") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) return json({ error: "Credenciais não configuradas" }, 400);
      const { asaas_payment_id } = body;
      const result = await callAsaas("GET", `/payments/${asaas_payment_id}`, integration.api_key_encrypted, integration.environment);
      if (!result.ok) return json({ error: "Cobrança não encontrada no Asaas" }, 404);
      const p = result.data;
      await supabaseAdmin.from("tenant_asaas_payments")
        .update({ status: p.status, value: p.value, net_value: p.netValue, payment_date: p.paymentDate, invoice_url: p.invoiceUrl, bank_slip_url: p.bankSlipUrl, raw_payload: p } as any)
        .eq("tenant_id", tenant_id).eq("asaas_payment_id", asaas_payment_id);
      return json({ success: true, payment: p });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("asaas-api error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});
