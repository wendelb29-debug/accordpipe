import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-orbit-token",
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
    // Validate orbit token
    const token = req.headers.get("x-orbit-token") || req.headers.get("X-Orbit-Token");
    const expectedToken = Deno.env.get("VENDAS_WEBHOOK_TOKEN");

    if (!expectedToken) {
      console.error("VENDAS_WEBHOOK_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (token !== expectedToken) {
      console.error("Invalid orbit token");
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("Orbit vendas webhook received:", JSON.stringify(payload));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      mentor_id,
      mentor_nome,
      aluno_nome,
      aluno_email,
      produto,
      valor,
      transacao_id,
      data_venda,
      gateway,
    } = payload;

    // Validate required fields
    if (!mentor_id || !mentor_nome || !aluno_nome || !aluno_email || !produto || !transacao_id) {
      return new Response(
        JSON.stringify({
          error: "Campos obrigatórios: mentor_id, mentor_nome, aluno_nome, aluno_email, produto, transacao_id",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for duplicate transacao_id
    const { data: existing, error: checkError } = await supabase
      .from("vendas_orbit")
      .select("id")
      .eq("transacao_id", String(transacao_id))
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
          transacao_id,
          message: "Transação duplicada ignorada",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert sale
    const { error: insertError } = await supabase.from("vendas_orbit").insert({
      mentor_id: String(mentor_id).slice(0, 255),
      mentor_nome: String(mentor_nome).slice(0, 255),
      aluno_nome: String(aluno_nome).slice(0, 255),
      aluno_email: String(aluno_email).slice(0, 255),
      produto: String(produto).slice(0, 255),
      valor: valor ? parseFloat(String(valor)) : 0,
      transacao_id: String(transacao_id).slice(0, 255),
      data_venda: data_venda || new Date().toISOString(),
      gateway: gateway ? String(gateway).slice(0, 100) : "webhook",
    });

    if (insertError) {
      console.error("Error saving sale:", insertError);
      return new Response(JSON.stringify({ error: "Error saving sale" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ received: true, transacao_id, message: "Venda registrada com sucesso" }),
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
