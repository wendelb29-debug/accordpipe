import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-token",
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
    // Validate webhook token
    const token =
      req.headers.get("x-webhook-token") ||
      req.headers.get("X-Webhook-Token");
    const expectedToken = Deno.env.get("VENDAS_WEBHOOK_TOKEN");

    if (!expectedToken) {
      console.error("VENDAS_WEBHOOK_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (token !== expectedToken) {
      console.error("Invalid webhook token");
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("Vendas webhook received:", JSON.stringify(payload));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      mentor_id,
      mentor_nome,
      nome_aluno,
      email_aluno,
      produto,
      valor,
      data_venda,
      origem,
    } = payload;

    if (!mentor_id || !mentor_nome || !nome_aluno || !email_aluno || !produto) {
      return new Response(
        JSON.stringify({
          error: "Campos obrigatórios: mentor_id, mentor_nome, nome_aluno, email_aluno, produto",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: insertError } = await supabase
      .from("vendas_webhook")
      .insert({
        mentor_id: String(mentor_id).slice(0, 255),
        mentor_nome: String(mentor_nome).slice(0, 255),
        nome_aluno: String(nome_aluno).slice(0, 255),
        email_aluno: String(email_aluno).slice(0, 255),
        produto: String(produto).slice(0, 255),
        valor: valor ? parseFloat(String(valor)) : 0,
        data_venda: data_venda || new Date().toISOString(),
        origem: origem ? String(origem).slice(0, 100) : "webhook",
      });

    if (insertError) {
      console.error("Error saving sale:", insertError);
      return new Response(JSON.stringify({ error: "Error saving sale" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
