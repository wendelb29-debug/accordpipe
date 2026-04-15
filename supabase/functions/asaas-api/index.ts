import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_URLS: Record<string, string> = {
  sandbox: "https://sandbox.asaas.com/api/v3",
  production: "https://api.asaas.com/v3",
};

function maskApiKey(key: string): string {
  if (key.length <= 10) return "****";
  return key.substring(0, 10) + "****";
}

// ALWAYS return 200 so supabase.functions.invoke can read the body
function json(body: any) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, details?: string) {
  return json({ success: false, code, message, details: details || message });
}

function getAsaasErrorDescription(data: any, fallback: string) {
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const firstDescription = data.errors.find((item: any) => typeof item?.description === "string")?.description;
    if (firstDescription) return firstDescription;
  }
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  return fallback;
}

function isEnvironmentMismatch(message: string) {
  return /não pertence a este ambiente/i.test(message);
}

function detectEnvironmentFromKey(apiKey: string): string | null {
  if (apiKey?.startsWith("$aact_prod")) return "production";
  if (apiKey?.startsWith("$aact_")) return "sandbox";
  return null;
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

    console.log(`[asaas-api] action=${action} tenant=${tenant_id} user=${userId}`);

    if (!tenant_id) return errorResponse("MISSING_TENANT", "tenant_id required");

    async function getIntegration() {
      const { data, error } = await supabaseAdmin
        .from("tenant_fintech_integrations")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("provider", "asaas")
        .maybeSingle();
      if (error) console.error("[asaas-api] getIntegration error:", error.message);
      return data as any;
    }

    function validateIntegration(integration: any): Response | null {
      if (!integration) {
        return errorResponse("TENANT_ASAAS_NOT_CONFIGURED", "Integração Asaas não configurada para este tenant.");
      }
      if (!integration.api_key_encrypted) {
        return errorResponse("ASAAS_NO_API_KEY", "API Key do Asaas não configurada. Vá em Configurações > Fintech.");
      }
      return null;
    }

    async function callAsaas(method: string, path: string, apiKey: string, env: string, payload?: any) {
      const base = ASAAS_URLS[env] || ASAAS_URLS.sandbox;
      const url = `${base}${path}`;
      console.log(`[asaas-api] ${method} ${url} env=${env}`);
      if (payload) console.log(`[asaas-api] payload: ${JSON.stringify(payload)}`);
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "access_token": apiKey },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      console.log(`[asaas-api] response status=${res.status} ok=${res.ok}`);
      if (!res.ok) console.log(`[asaas-api] error body: ${JSON.stringify(data)}`);
      return { ok: res.ok, status: res.status, data };
    }

    async function callAsaasWithEnvironmentFallback(integration: any, method: string, path: string, payload?: any) {
      const detectedEnv = detectEnvironmentFromKey(integration.api_key_encrypted);
      const currentEnvironment = detectedEnv || integration?.environment || "sandbox";

      if (detectedEnv && detectedEnv !== integration.environment) {
        console.log(`[asaas-api] Auto-correcting environment from ${integration.environment} to ${detectedEnv}`);
        await supabaseAdmin
          .from("tenant_fintech_integrations")
          .update({ environment: detectedEnv } as any)
          .eq("id", integration.id);
        integration.environment = detectedEnv;
      }

      const primaryResult = await callAsaas(method, path, integration.api_key_encrypted, currentEnvironment, payload);
      const primaryError = getAsaasErrorDescription(primaryResult.data, "Erro ao comunicar com o Asaas");

      if (primaryResult.ok || !isEnvironmentMismatch(primaryError)) {
        return { ...primaryResult, environment: currentEnvironment, environmentAutoCorrected: false, errorMessage: primaryError };
      }

      const fallbackEnvironment = currentEnvironment === "sandbox" ? "production" : "sandbox";
      console.log(`[asaas-api] Environment mismatch, trying fallback: ${fallbackEnvironment}`);
      const fallbackResult = await callAsaas(method, path, integration.api_key_encrypted, fallbackEnvironment, payload);
      const fallbackError = getAsaasErrorDescription(fallbackResult.data, primaryError);

      if (fallbackResult.ok) {
        await supabaseAdmin.from("tenant_fintech_integrations")
          .update({ environment: fallbackEnvironment, connection_status: "connected", last_connection_check_at: new Date().toISOString(), last_connection_error: null, updated_by: userId } as any)
          .eq("id", integration.id);
        integration.environment = fallbackEnvironment;
        return { ...fallbackResult, environment: fallbackEnvironment, environmentAutoCorrected: true, errorMessage: fallbackError };
      }

      return { ...fallbackResult, environment: currentEnvironment, environmentAutoCorrected: false, errorMessage: isEnvironmentMismatch(fallbackError) ? "Verifique se a chave foi gerada em Sandbox ou Produção e salve no ambiente correspondente." : fallbackError };
    }

    async function ensureCustomer(integration: any, localId: string, name: string, email?: string, cpfCnpj?: string, phone?: string) {
      console.log(`[asaas-api] ensureCustomer localId=${localId} name=${name} cpfCnpj=${cpfCnpj}`);
      
      const { data: existing, error: lookupErr } = await supabaseAdmin
        .from("tenant_asaas_customers")
        .select("asaas_customer_id")
        .eq("tenant_id", tenant_id)
        .eq("local_customer_id", localId)
        .maybeSingle();
      
      if (lookupErr) console.error("[asaas-api] customer lookup error:", lookupErr.message);
      if (existing) {
        console.log(`[asaas-api] existing customer found: ${(existing as any).asaas_customer_id}`);
        return { asaas_customer_id: (existing as any).asaas_customer_id, error: null };
      }

      // Clean cpfCnpj - remove non-numeric chars
      const cleanCpfCnpj = cpfCnpj ? cpfCnpj.replace(/\D/g, "") : undefined;
      
      const customerPayload: any = { name, externalReference: localId };
      if (email) customerPayload.email = email;
      if (cleanCpfCnpj) customerPayload.cpfCnpj = cleanCpfCnpj;
      if (phone) customerPayload.phone = phone;

      console.log(`[asaas-api] creating customer in Asaas:`, JSON.stringify(customerPayload));
      const result = await callAsaasWithEnvironmentFallback(integration, "POST", "/customers", customerPayload);
      
      if (!result.ok) {
        console.error(`[asaas-api] ensureCustomer FAILED: ${result.errorMessage}`);
        return { asaas_customer_id: null, error: result.errorMessage };
      }

      console.log(`[asaas-api] customer created: ${result.data.id}`);
      await supabaseAdmin.from("tenant_asaas_customers").insert({
        tenant_id, local_customer_id: localId, asaas_customer_id: result.data.id,
        name, email, cpf_cnpj: cleanCpfCnpj, phone,
      } as any);
      return { asaas_customer_id: result.data.id, error: null };
    }

    async function auditLog(actionName: string, targetId?: string, details?: any) {
      if (!userId) return;
      try {
        await supabaseAdmin.rpc("log_audit", {
          _user_id: userId, _user_name: "system", _action: actionName,
          _target_type: "fintech_asaas", _target_id: targetId || tenant_id,
          _details: { module: "fintech_asaas", ...details }, _servidor_id: tenant_id,
        });
      } catch (e: any) {
        console.error("[asaas-api] audit log error:", e.message);
      }
    }

    /* ──────── SAVE CREDENTIALS ──────── */
    if (action === "save_credentials") {
      const { api_key, environment } = body;
      if (!api_key) return errorResponse("MISSING_API_KEY", "api_key required");
      const sanitizedKey = api_key.trim().replace(/[^\w$_.\-]/g, "");
      if (sanitizedKey.length < 20) return errorResponse("INVALID_API_KEY", "API Key muito curta.");
      if (!sanitizedKey.startsWith("$aact_")) return errorResponse("INVALID_API_KEY", 'Formato de API Key inválido. A chave deve começar com "$aact_".');
      if (environment === "production" && !sanitizedKey.startsWith("$aact_prod")) return errorResponse("INVALID_API_KEY", 'Para Produção, a chave deve começar com "$aact_prod".');
      if (environment === "sandbox" && sanitizedKey.startsWith("$aact_prod")) return errorResponse("INVALID_API_KEY", "Esta chave é de Produção. Selecione o ambiente correto.");

      const masked = maskApiKey(sanitizedKey);
      const existing = await getIntegration();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const webhookUrl = `${supabaseUrl}/functions/v1/asaas-webhook?tenant=${tenant_id}`;

      if (existing) {
        await supabaseAdmin.from("tenant_fintech_integrations")
          .update({ api_key_encrypted: api_key, api_key_masked: masked, environment: environment || "sandbox", webhook_url: webhookUrl, updated_by: userId } as any)
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("tenant_fintech_integrations")
          .insert({ tenant_id, provider: "asaas", environment: environment || "sandbox", api_key_encrypted: api_key, api_key_masked: masked, webhook_url: webhookUrl, webhook_auth_token: null, created_by: userId, updated_by: userId } as any);
      }
      await auditLog(existing ? "asaas_credentials_updated" : "asaas_integration_created", tenant_id, { environment: environment || "sandbox" });
      return json({ success: true });
    }

    /* ──────── TEST CONNECTION ──────── */
    if (action === "test_connection") {
      const integration = await getIntegration();
      const err = validateIntegration(integration);
      if (err) return err;
      const { ok, status: httpStatus, data, errorMessage, environment, environmentAutoCorrected } = await callAsaasWithEnvironmentFallback(integration, "GET", "/customers?limit=1");
      console.log(`[asaas-api] test_connection result: ok=${ok} httpStatus=${httpStatus} errorMessage=${errorMessage} body=${JSON.stringify(data)}`);
      const newStatus = ok ? "connected" : "error";
      const detailedError = ok ? null : `HTTP ${httpStatus} — ${errorMessage}`;
      await supabaseAdmin.from("tenant_fintech_integrations")
        .update({ connection_status: newStatus, environment, last_connection_check_at: new Date().toISOString(), last_connection_error: detailedError } as any)
        .eq("id", integration.id);
      await auditLog("asaas_connection_tested", tenant_id, { status: newStatus, httpStatus, environment, environment_auto_corrected: environmentAutoCorrected });
      if (!ok) return errorResponse("ASAAS_CONNECTION_FAILED", detailedError!, detailedError!);
      return json({ success: true, status: newStatus, data, environment, environment_auto_corrected: environmentAutoCorrected });
    }

    /* ──────── GENERATE WEBHOOK TOKEN ──────── */
    if (action === "generate_webhook_token") {
      return errorResponse("MANUAL_TOKEN_REQUIRED", "O token do webhook deve ser informado manualmente com o accessToken gerado no Asaas.");
    }

    /* ──────── CREATE/UPDATE WEBHOOK ──────── */
    if (action === "create_webhook") {
      const integration = await getIntegration();
      const err = validateIntegration(integration);
      if (err) return err;
      if (!integration?.webhook_auth_token) {
        return errorResponse("WEBHOOK_TOKEN_MISSING", "Informe primeiro o accessToken do webhook gerado no Asaas.");
      }
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
        result = await callAsaasWithEnvironmentFallback(integration, "PUT", `/webhooks/${integration.webhook_remote_id}`, webhookPayload);
      } else {
        result = await callAsaasWithEnvironmentFallback(integration, "POST", "/webhooks", webhookPayload);
      }
      if (!result.ok) return errorResponse("ASAAS_WEBHOOK_FAILED", "Erro ao criar webhook no Asaas", result.errorMessage);
      await supabaseAdmin.from("tenant_fintech_integrations")
        .update({ webhook_remote_id: result.data.id || integration.webhook_remote_id, webhook_enabled: true, environment: result.environment, updated_by: userId } as any)
        .eq("id", integration.id);
      await auditLog(integration.webhook_remote_id ? "asaas_webhook_updated" : "asaas_webhook_created");
      return json({ success: true, environment: result.environment, environment_auto_corrected: result.environmentAutoCorrected });
    }

    /* ──────── CREATE CUSTOMER ──────── */
    if (action === "create_customer") {
      const integration = await getIntegration();
      const err = validateIntegration(integration);
      if (err) return err;
      const { local_customer_id, name, email, cpf_cnpj, phone } = body;
      if (!local_customer_id || !name) return errorResponse("INVALID_CUSTOMER", "Dados do cliente incompletos (id e nome obrigatórios).");
      const { asaas_customer_id, error: custError } = await ensureCustomer(integration, local_customer_id, name, email, cpf_cnpj, phone);
      if (custError || !asaas_customer_id) return errorResponse("ASAAS_CUSTOMER_CREATE_FAILED", "Erro ao criar/encontrar cliente no Asaas.", custError || "Cliente não pôde ser criado");
      return json({ success: true, asaas_customer_id, environment: integration.environment });
    }

    /* ──────── CREATE BILLING (BOLETO / PIX / UNDEFINED) ──────── */
    if (action === "create_billing") {
      const integration = await getIntegration();
      const err = validateIntegration(integration);
      if (err) return err;

      const {
        asaas_customer_id, local_customer_id, value, due_date, description,
        fine_value, interest_value, discount_value, installment_count, installment_value,
        billing_type = "BOLETO", origin = "manual",
      } = body;

      // Validate required fields
      if (!asaas_customer_id) return errorResponse("MISSING_CUSTOMER", "Cliente Asaas não informado. Selecione um cliente válido.");
      if (!value || Number(value) <= 0) return errorResponse("INVALID_VALUE", "Valor da cobrança deve ser maior que zero.");
      if (!due_date) return errorResponse("INVALID_DUE_DATE", "Data de vencimento é obrigatória.");

      console.log(`[asaas-api] create_billing type=${billing_type} value=${value} due=${due_date} customer=${asaas_customer_id}`);

      const billingPayload: any = {
        customer: asaas_customer_id,
        billingType: billing_type,
        value: Number(value),
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

      const result = await callAsaasWithEnvironmentFallback(integration, "POST", "/payments", billingPayload);
      if (!result.ok) return errorResponse("ASAAS_PIX_CREATE_FAILED", "Erro ao criar cobrança no Asaas.", result.errorMessage);

      const payment = result.data;
      console.log(`[asaas-api] payment created: ${payment.id} status=${payment.status}`);

      // Fetch boleto details if applicable
      let boletoDetails: any = {};
      if (billing_type === "BOLETO") {
        try {
          const idResult = await callAsaasWithEnvironmentFallback(integration, "GET", `/payments/${payment.id}/identificationField`);
          if (idResult.ok) {
            boletoDetails = { identification_field: idResult.data.identificationField, bar_code: idResult.data.barCode, nosso_numero: idResult.data.nossoNumero };
          }
        } catch (e: any) { console.error("[asaas-api] boleto details error:", e.message); }
      }

      // Fetch PIX QR Code if applicable
      let pixDetails: any = {};
      if (billing_type === "PIX") {
        try {
          const pixResult = await callAsaasWithEnvironmentFallback(integration, "GET", `/payments/${payment.id}/pixQrCode`);
          if (pixResult.ok) {
            pixDetails = { pix_payload: pixResult.data.payload, pix_qrcode_url: pixResult.data.encodedImage, pix_expiration: pixResult.data.expirationDate };
          } else {
            console.log(`[asaas-api] PIX QR not ready yet: ${pixResult.errorMessage}`);
          }
        } catch (e: any) { console.error("[asaas-api] pix qrcode error:", e.message); }
      }

      try {
        await supabaseAdmin.from("tenant_asaas_payments").insert({
          tenant_id, local_customer_id, asaas_customer_id,
          asaas_payment_id: payment.id, billing_type, status: payment.status,
          value: payment.value, net_value: payment.netValue, original_value: payment.originalValue,
          due_date: payment.dueDate, invoice_url: payment.invoiceUrl, bank_slip_url: payment.bankSlipUrl,
          description, external_reference: origin, raw_payload: payment,
          ...boletoDetails,
          ...(installment_count ? { installment_count, installment_value: installment_value || (value / installment_count), installment_id: payment.installment } : {}),
        } as any);
      } catch (e: any) { console.error("[asaas-api] DB insert error:", e.message); }

      await auditLog("asaas_billing_created", payment.id, { value, billing_type, origin });

      return json({
        success: true, payment_id: payment.id, status: payment.status,
        invoice_url: payment.invoiceUrl, bank_slip_url: payment.bankSlipUrl,
        due_date: payment.dueDate, environment: result.environment, environment_auto_corrected: result.environmentAutoCorrected, ...boletoDetails, ...pixDetails,
      });
    }

    /* ──────── GET PIX QR CODE ──────── */
    if (action === "get_pix_qrcode") {
      const integration = await getIntegration();
      const err = validateIntegration(integration);
      if (err) return err;
      const { asaas_payment_id } = body;
      const result = await callAsaasWithEnvironmentFallback(integration, "GET", `/payments/${asaas_payment_id}/pixQrCode`);
      if (!result.ok) return errorResponse("PIX_QRCODE_FAILED", "QR Code não disponível", result.errorMessage);
      return json({ success: true, payload: result.data.payload, qrcode_image: result.data.encodedImage, expiration: result.data.expirationDate, environment: result.environment, environment_auto_corrected: result.environmentAutoCorrected });
    }

    /* ──────── CREATE PAYMENT LINK ──────── */
    if (action === "create_payment_link") {
      const integration = await getIntegration();
      const err = validateIntegration(integration);
      if (err) return err;

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

      const result = await callAsaasWithEnvironmentFallback(integration, "POST", "/paymentLinks", linkPayload);
      if (!result.ok) return errorResponse("ASAAS_LINK_FAILED", "Erro ao criar link de pagamento", result.errorMessage);

      await auditLog("asaas_payment_link_created", result.data.id, { value, name });
      return json({ success: true, link: result.data, environment: result.environment, environment_auto_corrected: result.environmentAutoCorrected });
    }

    /* ──────── CREATE SUBSCRIPTION ──────── */
    if (action === "create_subscription") {
      const integration = await getIntegration();
      const err = validateIntegration(integration);
      if (err) return err;

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

      const result = await callAsaasWithEnvironmentFallback(integration, "POST", "/subscriptions", subPayload);
      if (!result.ok) return errorResponse("ASAAS_SUBSCRIPTION_FAILED", "Erro ao criar assinatura", result.errorMessage);

      await supabaseAdmin.from("tenant_asaas_subscriptions").insert({
        tenant_id, local_customer_id, asaas_customer_id,
        asaas_subscription_id: result.data.id, billing_type, cycle, value,
        next_due_date, end_date, status: result.data.status || "ACTIVE",
        description: desc, external_reference: tenant_id, raw_payload: result.data,
      } as any);

      await auditLog("asaas_subscription_created", result.data.id, { value, cycle, billing_type });
      return json({ success: true, subscription: result.data, environment: result.environment, environment_auto_corrected: result.environmentAutoCorrected });
    }

    /* ──────── REFUND PAYMENT ──────── */
    if (action === "refund_payment") {
      const integration = await getIntegration();
      const err = validateIntegration(integration);
      if (err) return err;
      const { asaas_payment_id, value: refundValue, description: refundDesc } = body;

      const refundPayload: any = {};
      if (refundValue) refundPayload.value = refundValue;
      if (refundDesc) refundPayload.description = refundDesc;

      const result = await callAsaasWithEnvironmentFallback(integration, "POST", `/payments/${asaas_payment_id}/refund`, refundPayload);
      if (!result.ok) return errorResponse("ASAAS_REFUND_FAILED", "Erro ao estornar", result.errorMessage);

      await supabaseAdmin.from("tenant_asaas_payments")
        .update({ status: "REFUNDED", raw_payload: result.data } as any)
        .eq("tenant_id", tenant_id).eq("asaas_payment_id", asaas_payment_id);

      await auditLog("asaas_payment_refunded", asaas_payment_id, { value: refundValue });
      return json({ success: true });
    }

    /* ──────── CANCEL SUBSCRIPTION ──────── */
    if (action === "cancel_subscription") {
      const integration = await getIntegration();
      const err = validateIntegration(integration);
      if (err) return err;
      const { asaas_subscription_id } = body;
      const result = await callAsaasWithEnvironmentFallback(integration, "DELETE", `/subscriptions/${asaas_subscription_id}`);
      if (!result.ok) return errorResponse("ASAAS_CANCEL_FAILED", "Erro ao cancelar assinatura", result.errorMessage);

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
      if (error) return errorResponse("DB_QUERY_FAILED", "Erro ao buscar cobranças", error.message);
      return json({ success: true, payments: data });
    }

    /* ──────── SYNC PAYMENT ──────── */
    if (action === "sync_payment") {
      const integration = await getIntegration();
      const err = validateIntegration(integration);
      if (err) return err;
      const { asaas_payment_id } = body;
      const result = await callAsaasWithEnvironmentFallback(integration, "GET", `/payments/${asaas_payment_id}`);
      if (!result.ok) return errorResponse("ASAAS_SYNC_FAILED", "Cobrança não encontrada no Asaas", result.errorMessage);
      const p = result.data;
      await supabaseAdmin.from("tenant_asaas_payments")
        .update({ status: p.status, value: p.value, net_value: p.netValue, payment_date: p.paymentDate, invoice_url: p.invoiceUrl, bank_slip_url: p.bankSlipUrl, raw_payload: p } as any)
        .eq("tenant_id", tenant_id).eq("asaas_payment_id", asaas_payment_id);
      return json({ success: true, payment: p, environment: result.environment, environment_auto_corrected: result.environmentAutoCorrected });
    }

    return errorResponse("UNKNOWN_ACTION", `Ação desconhecida: ${action}`);
  } catch (e: any) {
    console.error("[asaas-api] unhandled error:", e);
    return json({ success: false, code: "INTERNAL_ERROR", message: e.message || "Erro interno", details: e.message });
  }
});
