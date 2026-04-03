import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-accord-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Normalize different platform payloads into our standard format
function normalizePayload(payload: any): {
  mentor_id: string;
  mentor_nome: string;
  aluno_nome: string;
  aluno_email: string;
  produto: string;
  valor: number;
  transacao_id: string;
  data_venda: string;
  gateway: string;
} | null {
  // Already in our standard format
  if (payload.mentor_id && payload.transacao_id) {
    return {
      mentor_id: String(payload.mentor_id),
      mentor_nome: String(payload.mentor_nome || payload.mentor_id),
      aluno_nome: String(payload.aluno_nome || payload.nome_comprador || payload.customer_name || ""),
      aluno_email: String(payload.aluno_email || payload.email_comprador || payload.customer_email || ""),
      produto: String(payload.produto || payload.product_name || ""),
      valor: parseFloat(String(payload.valor || payload.value || payload.amount || 0)),
      transacao_id: String(payload.transacao_id),
      data_venda: payload.data_venda || new Date().toISOString(),
      gateway: String(payload.gateway || "webhook"),
    };
  }

  // Eduzz format
  if (payload.evento || payload.trans || payload.eduzz) {
    const trans = payload.trans || payload;
    const customer = payload.cliente || payload.customer || {};
    return {
      mentor_id: String(payload.mentor_id || payload.produtor_id || trans.produtor_id || "eduzz"),
      mentor_nome: String(payload.mentor_nome || payload.produtor_nome || trans.produtor_nome || "Eduzz"),
      aluno_nome: String(customer.nome || payload.nome_comprador || trans.nome_comprador || ""),
      aluno_email: String(customer.email || payload.email_comprador || trans.email_comprador || ""),
      produto: String(trans.produto_nome || payload.produto_nome || payload.produto || trans.item_name || ""),
      valor: parseFloat(String(trans.valor || payload.valor || trans.amount || 0)),
      transacao_id: String(trans.codigo_transacao || trans.transaction_code || payload.transaction_id || payload.trans_cod || `eduzz-${Date.now()}`),
      data_venda: trans.data_venda || payload.data_criacao || new Date().toISOString(),
      gateway: "Eduzz",
    };
  }

  // Hotmart format
  if (payload.data?.purchase || payload.event === "PURCHASE_COMPLETE" || payload.hottok) {
    const purchase = payload.data?.purchase || payload.purchase || {};
    const buyer = payload.data?.buyer || payload.buyer || {};
    const product = payload.data?.product || payload.product || {};
    return {
      mentor_id: String(payload.mentor_id || product.producer_id || "hotmart"),
      mentor_nome: String(payload.mentor_nome || product.producer_name || "Hotmart"),
      aluno_nome: String(buyer.name || buyer.nome || ""),
      aluno_email: String(buyer.email || ""),
      produto: String(product.name || product.nome || ""),
      valor: parseFloat(String(purchase.price?.value || purchase.original_offer_price?.value || 0)),
      transacao_id: String(purchase.transaction || purchase.order_bump?.transaction || `hotmart-${Date.now()}`),
      data_venda: purchase.order_date || purchase.approved_date || new Date().toISOString(),
      gateway: "Hotmart",
    };
  }

  // Kiwify format
  if (payload.order_id || payload.subscription_id || payload.kiwify) {
    return {
      mentor_id: String(payload.mentor_id || payload.producer_id || "kiwify"),
      mentor_nome: String(payload.mentor_nome || payload.producer_name || "Kiwify"),
      aluno_nome: String(payload.Customer?.full_name || payload.customer_name || payload.nome_comprador || ""),
      aluno_email: String(payload.Customer?.email || payload.customer_email || payload.email_comprador || ""),
      produto: String(payload.Product?.product_name || payload.product_name || ""),
      valor: parseFloat(String(payload.Commissions?.charge_amount || payload.amount || payload.valor || 0)),
      transacao_id: String(payload.order_id || payload.subscription_id || `kiwify-${Date.now()}`),
      data_venda: payload.sale_date || payload.created_at || new Date().toISOString(),
      gateway: "Kiwify",
    };
  }

  // Monetizze format
  if (payload.produto?.codigo || payload.venda?.codigo) {
    const venda = payload.venda || {};
    const prod = payload.produto || {};
    const comprador = payload.comprador || {};
    return {
      mentor_id: String(payload.mentor_id || prod.produtor || "monetizze"),
      mentor_nome: String(payload.mentor_nome || "Monetizze"),
      aluno_nome: String(comprador.nome || ""),
      aluno_email: String(comprador.email || ""),
      produto: String(prod.nome || ""),
      valor: parseFloat(String(venda.valor || 0)),
      transacao_id: String(venda.codigo || `monetizze-${Date.now()}`),
      data_venda: venda.dataInicio || new Date().toISOString(),
      gateway: "Monetizze",
    };
  }

  // Generic fallback - try to extract whatever we can
  const nome = payload.nome_comprador || payload.customer_name || payload.buyer_name || payload.name || "";
  const email = payload.email_comprador || payload.customer_email || payload.buyer_email || payload.email || "";
  const produto = payload.produto || payload.product_name || payload.product || payload.item_name || "";
  const valor = payload.valor || payload.value || payload.amount || payload.price || 0;
  const transacao = payload.transaction_id || payload.order_id || payload.id || payload.trans_cod || "";

  if (!transacao && !nome && !email) {
    return null;
  }

  return {
    mentor_id: String(payload.mentor_id || payload.producer_id || "generic"),
    mentor_nome: String(payload.mentor_nome || payload.producer_name || "Webhook"),
    aluno_nome: String(nome),
    aluno_email: String(email),
    produto: String(produto),
    valor: parseFloat(String(valor)) || 0,
    transacao_id: String(transacao || `wh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    data_venda: payload.data_venda || payload.sale_date || payload.created_at || new Date().toISOString(),
    gateway: String(payload.gateway || payload.platform || "webhook"),
  };
}

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
    // Validate accord token
    const token = req.headers.get("x-accord-token") || req.headers.get("X-Accord-Token");
    const expectedToken = Deno.env.get("VENDAS_WEBHOOK_TOKEN");

    if (!expectedToken) {
      console.error("VENDAS_WEBHOOK_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (token !== expectedToken) {
      console.error("Invalid accord token");
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("Accord vendas webhook received:", JSON.stringify(payload));

    // Normalize payload from any platform format
    const normalized = normalizePayload(payload);

    if (!normalized) {
      console.error("Could not normalize payload:", JSON.stringify(payload));
      return new Response(
        JSON.stringify({
          error: "Payload não reconhecido. Envie ao menos: nome, email e um identificador de transação.",
          received_keys: Object.keys(payload),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Normalized payload:", JSON.stringify(normalized));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicate transacao_id
    const { data: existing, error: checkError } = await supabase
      .from("vendas_accord")
      .select("id")
      .eq("transacao_id", normalized.transacao_id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking duplicate:", checkError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing) {
      return new Response(
        JSON.stringify({
          error: "Venda já registrada",
          transacao_id: normalized.transacao_id,
          message: "Transação duplicada ignorada",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert sale
    const { error: insertError } = await supabase.from("vendas_accord").insert({
      mentor_id: normalized.mentor_id.slice(0, 255),
      mentor_nome: normalized.mentor_nome.slice(0, 255),
      aluno_nome: normalized.aluno_nome.slice(0, 255),
      aluno_email: normalized.aluno_email.slice(0, 255),
      produto: normalized.produto.slice(0, 255),
      valor: normalized.valor,
      transacao_id: normalized.transacao_id.slice(0, 255),
      data_venda: normalized.data_venda,
      gateway: normalized.gateway.slice(0, 100),
    });

    if (insertError) {
      console.error("Error saving sale:", insertError);
      return new Response(JSON.stringify({ error: "Error saving sale" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        received: true,
        transacao_id: normalized.transacao_id,
        gateway: normalized.gateway,
        message: "Venda registrada com sucesso",
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
