import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o Accord, um assistente de escrita integrado ao CRM Accord.

Sua função é ajudar o usuário a escrever e melhorar notas comerciais sobre leads e oportunidades.

Você pode:
1. MELHORAR a redação de uma nota existente (tornar mais profissional e clara)
2. COMPLETAR uma nota parcialmente escrita
3. SUGERIR uma nota com base no contexto do lead

REGRAS:
- Responda APENAS com o texto da nota melhorada/sugerida, sem explicações adicionais
- Use linguagem profissional em português brasileiro
- Mantenha o tom comercial e objetivo
- Use **negrito** para destacar pontos importantes
- Seja conciso e direto
- Nunca invente dados como valores, CPFs ou datas
- Se o texto original já estiver bom, faça apenas pequenos ajustes de clareza`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, action, leadContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let userPrompt = "";
    if (action === "improve") {
      userPrompt = `Melhore a redação desta nota comercial:\n\n"${text}"\n\nContexto do lead: ${leadContext || "Não disponível"}`;
    } else if (action === "complete") {
      userPrompt = `Complete esta nota comercial que está parcialmente escrita:\n\n"${text}"\n\nContexto do lead: ${leadContext || "Não disponível"}`;
    } else if (action === "suggest") {
      userPrompt = `Sugira uma nota de acompanhamento profissional para este lead.\n\nContexto: ${leadContext || "Não disponível"}`;
    } else {
      userPrompt = `Melhore este texto:\n\n"${text}"`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("note-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
