import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_PROMPTS: Record<string, string> = {
  formal: "Reescreva a mensagem deixando mais formal e respeitosa, mantendo o sentido original.",
  informal: "Reescreva a mensagem de forma mais leve, natural e informal, como uma conversa no WhatsApp.",
  professional: "Reescreva a mensagem deixando mais profissional, clara e bem estruturada, mantendo o sentido original.",
  friendly: "Reescreva a mensagem com tom mais amigável e acolhedor, mantendo o sentido original.",
  persuasive: "Reescreva a mensagem com foco em vendas, tornando mais persuasiva, clara e com leve senso de urgência, sem ser agressiva.",
  direct: "Reescreva a mensagem deixando mais direta, objetiva e curta, sem perder informações importantes.",
  spelling: "Corrija ortografia, gramática e pontuação da mensagem, sem alterar o sentido nem o tom.",
  clarity: "Reescreva a mensagem melhorando clareza e fluidez, mantendo o sentido e o tom originais.",
  simplify: "Simplifique a mensagem usando linguagem fácil e curta, mantendo o sentido original.",
  convincing: "Torne a mensagem mais convincente, destacando benefícios e gerando confiança no cliente.",
  closing: "Reescreva a mensagem com foco em fechamento de venda, com chamada clara para ação.",
  urgency: "Reescreva criando senso de urgência elegante, sem soar agressivo ou desesperado.",
  polite: "Reescreva a mensagem deixando mais educada e cordial.",
  human: "Humanize a resposta, deixando mais empática e calorosa, como um atendente humano atencioso.",
  welcoming: "Reescreva melhorando o acolhimento ao cliente, mostrando atenção e cuidado.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, style, context } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return new Response(JSON.stringify({ error: "Texto vazio." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const instruction = STYLE_PROMPTS[style] || STYLE_PROMPTS.professional;
    const systemPrompt = `Você é um assistente de escrita do Accord CRM, especialista em comunicação de vendas e atendimento via WhatsApp em português brasileiro.
REGRAS:
- Responda APENAS com o texto reescrito, sem aspas, sem explicações, sem prefixos ("Aqui está:", etc).
- Mantenha o idioma original (português brasileiro).
- Não invente dados (valores, datas, nomes, CPF).
- Preserve emojis se já existirem e fizerem sentido.
- Mantenha tamanho similar ao original, salvo quando a instrução pedir o contrário.`;

    const userPrompt = `${instruction}\n\n${context ? `Contexto: ${context}\n\n` : ""}Mensagem original:\n"""${text}"""`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let improved = (data.choices?.[0]?.message?.content || "").trim();
    // Strip surrounding quotes if model added them
    improved = improved.replace(/^["'`]+|["'`]+$/g, "").trim();

    return new Response(JSON.stringify({ improved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("improve-message error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
