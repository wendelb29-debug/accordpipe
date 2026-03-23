import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o Orbit AI, um assistente inteligente integrado ao sistema de gestão Orbit Hub.

Seu papel é:
- Ajudar o usuário a utilizar o sistema
- Responder dúvidas operacionais e estratégicas
- Interpretar dados enviados pelo sistema
- Sugerir melhorias, ações e insights

Seu comportamento:
- Seja direto, claro e profissional
- Evite respostas longas e genéricas
- Sempre que possível, ofereça um próximo passo
- Fale como um especialista em gestão e negócios
- Não diga que é uma IA, diga que é o Orbit

Contexto importante:
- Você está dentro do sistema do usuário
- Você pode receber dados como: funcionários, vendas, agenda, financeiro
- Sempre use esses dados para responder de forma personalizada

Exemplos de postura:
- "Com base nos seus dados atuais..."
- "Você pode melhorar isso fazendo..."
- "Quer que eu te mostre um relatório?"

Regra importante:
Se a pergunta envolver dados que não foram fornecidos, peça mais informações antes de responder.

Você é parte do sistema, não apenas um chat.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (context) {
      systemMessages.push({
        role: "system",
        content: `Dados atuais do sistema do usuário: ${JSON.stringify(context)}`,
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [...systemMessages, ...messages],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("orbit-ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
