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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate user auth
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsErr } = await supabaseAdmin.auth.getUser(token);
      if (!claimsErr && claims?.user) userId = claims.user.id;
    }

    const body = await req.json();
    const { action, tenant_id } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Helper: get integration
    async function getIntegration() {
      const { data } = await supabaseAdmin
        .from("tenant_fintech_integrations")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("provider", "asaas")
        .maybeSingle();
      return data as any;
    }

    // Helper: call Asaas
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

    /* ──────── SAVE CREDENTIALS ──────── */
    if (action === "save_credentials") {
      const { api_key, environment } = body;
      if (!api_key) return new Response(JSON.stringify({ error: "api_key required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const masked = maskApiKey(api_key);
      const existing = await getIntegration();

      // Generate webhook URL
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const webhookUrl = `${supabaseUrl}/functions/v1/asaas-webhook?tenant=${tenant_id}`;

      if (existing) {
        await supabaseAdmin
          .from("tenant_fintech_integrations")
          .update({
            api_key_encrypted: api_key,
            api_key_masked: masked,
            environment: environment || "sandbox",
            webhook_url: webhookUrl,
            updated_by: userId,
          } as any)
          .eq("id", existing.id);
      } else {
        // Generate webhook auth token
        const token = crypto.randomUUID();
        await supabaseAdmin
          .from("tenant_fintech_integrations")
          .insert({
            tenant_id,
            provider: "asaas",
            environment: environment || "sandbox",
            api_key_encrypted: api_key,
            api_key_masked: masked,
            webhook_url: webhookUrl,
            webhook_auth_token: token,
            created_by: userId,
            updated_by: userId,
          } as any);
      }

      // Audit log
      if (userId) {
        await supabaseAdmin.rpc("log_audit", {
          _user_id: userId,
          _user_name: "system",
          _action: existing ? "asaas_credentials_updated" : "asaas_integration_created",
          _target_type: "fintech_asaas",
          _target_id: tenant_id,
          _details: { module: "fintech_asaas", environment: environment || "sandbox" },
          _servidor_id: tenant_id,
        });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    /* ──────── TEST CONNECTION ──────── */
    if (action === "test_connection") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) {
        return new Response(JSON.stringify({ error: "Credenciais não configuradas" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { ok, data } = await callAsaas("GET", "/finance/balance", integration.api_key_encrypted, integration.environment);

      const newStatus = ok ? "connected" : "error";
      await supabaseAdmin
        .from("tenant_fintech_integrations")
        .update({
          connection_status: newStatus,
          last_connection_check_at: new Date().toISOString(),
          last_connection_error: ok ? null : (data?.errors?.[0]?.description || "Falha na conexão"),
        } as any)
        .eq("id", integration.id);

      if (userId) {
        await supabaseAdmin.rpc("log_audit", {
          _user_id: userId, _user_name: "system", _action: "asaas_connection_tested",
          _target_type: "fintech_asaas", _target_id: tenant_id,
          _details: { module: "fintech_asaas", status: newStatus },
          _servidor_id: tenant_id,
        });
      }

      return new Response(JSON.stringify({ status: newStatus, balance: ok ? data : null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    /* ──────── GENERATE WEBHOOK TOKEN ──────── */
    if (action === "generate_webhook_token") {
      let integration = await getIntegration();
      const newToken = crypto.randomUUID();
      if (!integration) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const webhookUrl = `${supabaseUrl}/functions/v1/asaas-webhook?tenant=${tenant_id}`;
        await supabaseAdmin
          .from("tenant_fintech_integrations")
          .insert({
            tenant_id, provider: "asaas", environment: "sandbox",
            api_key_encrypted: "", api_key_masked: "",
            webhook_url: webhookUrl, webhook_auth_token: newToken,
            created_by: userId, updated_by: userId,
          } as any);
      } else {
        await supabaseAdmin
          .from("tenant_fintech_integrations")
          .update({ webhook_auth_token: newToken, updated_by: userId } as any)
          .eq("id", integration.id);
      }

      return new Response(JSON.stringify({ success: true, token: newToken }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    /* ──────── CREATE/UPDATE WEBHOOK ──────── */
    if (action === "create_webhook") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) {
        return new Response(JSON.stringify({ error: "Credenciais não configuradas" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const webhookPayload = {
        name: `ACCORD Webhook - ${tenant_id.substring(0, 8)}`,
        url: integration.webhook_url,
        email: "",
        enabled: true,
        interrupted: false,
        apiVersion: 3,
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
        await supabaseAdmin
          .from("tenant_fintech_integrations")
          .update({
            webhook_remote_id: result.data.id || integration.webhook_remote_id,
            webhook_enabled: true,
            updated_by: userId,
          } as any)
          .eq("id", integration.id);

        if (userId) {
          await supabaseAdmin.rpc("log_audit", {
            _user_id: userId, _user_name: "system",
            _action: integration.webhook_remote_id ? "asaas_webhook_updated" : "asaas_webhook_created",
            _target_type: "fintech_asaas", _target_id: tenant_id,
            _details: { module: "fintech_asaas" }, _servidor_id: tenant_id,
          });
        }
      }

      return new Response(JSON.stringify(result.ok ? { success: true } : { error: result.data?.errors?.[0]?.description || "Erro ao criar webhook" }), {
        status: result.ok ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ──────── CREATE CUSTOMER ──────── */
    if (action === "create_customer") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) {
        return new Response(JSON.stringify({ error: "Credenciais não configuradas" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { local_customer_id, name, email, cpf_cnpj, phone } = body;

      // Check if already mapped
      const { data: existing } = await supabaseAdmin
        .from("tenant_asaas_customers")
        .select("asaas_customer_id")
        .eq("tenant_id", tenant_id)
        .eq("local_customer_id", local_customer_id)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ asaas_customer_id: (existing as any).asaas_customer_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await callAsaas("POST", "/customers", integration.api_key_encrypted, integration.environment, {
        name, email, cpfCnpj: cpf_cnpj, phone, externalReference: local_customer_id,
      });

      if (!result.ok) {
        return new Response(JSON.stringify({ error: result.data?.errors?.[0]?.description || "Erro ao criar cliente" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabaseAdmin.from("tenant_asaas_customers").insert({
        tenant_id, local_customer_id, asaas_customer_id: result.data.id,
        name, email, cpf_cnpj: cpf_cnpj, phone,
      } as any);

      return new Response(JSON.stringify({ asaas_customer_id: result.data.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    /* ──────── CREATE BILLING (BOLETO) ──────── */
    if (action === "create_billing") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) {
        return new Response(JSON.stringify({ error: "Credenciais não configuradas" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { asaas_customer_id, local_customer_id, value, due_date, description, fine_value, interest_value, installment_count, installment_value } = body;

      const billingPayload: any = {
        customer: asaas_customer_id,
        billingType: "BOLETO",
        value,
        dueDate: due_date,
        description: description || "Cobrança gerada pelo ACCORD",
        externalReference: tenant_id,
      };

      if (fine_value) billingPayload.fine = { value: fine_value, type: "FIXED" };
      if (interest_value) billingPayload.interest = { value: interest_value, type: "PERCENTAGE" };
      if (installment_count && installment_count > 1) {
        billingPayload.installmentCount = installment_count;
        billingPayload.installmentValue = installment_value || (value / installment_count);
      }

      const result = await callAsaas("POST", "/payments", integration.api_key_encrypted, integration.environment, billingPayload);

      if (!result.ok) {
        return new Response(JSON.stringify({ error: result.data?.errors?.[0]?.description || "Erro ao criar cobrança" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const payment = result.data;

      // Fetch identification field (boleto details)
      let boletoDetails: any = {};
      try {
        const idResult = await callAsaas("GET", `/payments/${payment.id}/identificationField`, integration.api_key_encrypted, integration.environment);
        if (idResult.ok) {
          boletoDetails = {
            identification_field: idResult.data.identificationField,
            bar_code: idResult.data.barCode,
            nosso_numero: idResult.data.nossoNumero,
          };
        }
      } catch {}

      // Save locally
      await supabaseAdmin.from("tenant_asaas_payments").insert({
        tenant_id,
        local_customer_id,
        asaas_customer_id,
        asaas_payment_id: payment.id,
        billing_type: "BOLETO",
        status: payment.status,
        value: payment.value,
        net_value: payment.netValue,
        original_value: payment.originalValue,
        due_date: payment.dueDate,
        invoice_url: payment.invoiceUrl,
        bank_slip_url: payment.bankSlipUrl,
        description,
        external_reference: tenant_id,
        raw_payload: payment,
        ...boletoDetails,
        ...(installment_count ? { installment_count, installment_value: installment_value || (value / installment_count), installment_id: payment.installment } : {}),
      } as any);

      if (userId) {
        await supabaseAdmin.rpc("log_audit", {
          _user_id: userId, _user_name: "system", _action: "asaas_billing_created",
          _target_type: "fintech_asaas", _target_id: payment.id,
          _details: { module: "fintech_asaas", value, billing_type: "BOLETO" }, _servidor_id: tenant_id,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        payment_id: payment.id,
        status: payment.status,
        invoice_url: payment.invoiceUrl,
        bank_slip_url: payment.bankSlipUrl,
        due_date: payment.dueDate,
        ...boletoDetails,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    /* ──────── LIST WALLET ──────── */
    if (action === "list_wallet") {
      const { status: filterStatus, period_start, period_end, customer_id, limit: lim } = body;
      let query = supabaseAdmin
        .from("tenant_asaas_payments")
        .select("*")
        .eq("tenant_id", tenant_id)
        .order("created_at", { ascending: false })
        .limit(lim || 50);

      if (filterStatus) query = query.eq("status", filterStatus);
      if (customer_id) query = query.eq("local_customer_id", customer_id);
      if (period_start) query = query.gte("due_date", period_start);
      if (period_end) query = query.lte("due_date", period_end);

      const { data, error } = await query;
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      return new Response(JSON.stringify({ payments: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    /* ──────── SYNC PAYMENT ──────── */
    if (action === "sync_payment") {
      const integration = await getIntegration();
      if (!integration?.api_key_encrypted) {
        return new Response(JSON.stringify({ error: "Credenciais não configuradas" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { asaas_payment_id } = body;
      const result = await callAsaas("GET", `/payments/${asaas_payment_id}`, integration.api_key_encrypted, integration.environment);
      if (!result.ok) {
        return new Response(JSON.stringify({ error: "Cobrança não encontrada no Asaas" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const p = result.data;
      await supabaseAdmin
        .from("tenant_asaas_payments")
        .update({
          status: p.status, value: p.value, net_value: p.netValue,
          payment_date: p.paymentDate, invoice_url: p.invoiceUrl,
          bank_slip_url: p.bankSlipUrl, raw_payload: p,
        } as any)
        .eq("tenant_id", tenant_id)
        .eq("asaas_payment_id", asaas_payment_id);

      return new Response(JSON.stringify({ success: true, payment: p }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("asaas-api error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
