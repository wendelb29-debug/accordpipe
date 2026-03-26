import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o Orbit, um assistente inteligente proativo integrado ao CRM Orbit Hub.

Ao receber os dados da página atual, você deve:

1. ANALISAR todos os dados visíveis
2. IDENTIFICAR problemas, erros, inconsistências
3. SUGERIR melhorias e otimizações

Sua resposta DEVE seguir EXATAMENTE esta estrutura com os 3 blocos:

## ✅ Versão Corrigida
Identifique e corrija todos os erros encontrados:
- Dados incorretos ou mal formatados
- Textos com erros de ortografia
- Campos vazios que deveriam estar preenchidos
- Inconsistências nos dados

Se não houver erros, diga "Nenhum erro identificado. Os dados estão corretos."

## 🚀 Versão Otimizada
Sugira como melhorar os dados e processos:
- Textos mais profissionais
- Dados mais completos
- Formatação padronizada
- Oportunidades de melhoria nos processos

## 💡 Sugestões Extras
Insights estratégicos adicionais:
- Oportunidades que o usuário pode estar perdendo
- Dicas de produtividade
- Alertas importantes
- Próximos passos recomendados

REGRAS:
- Seja direto e objetivo
- Use bullet points
- Linguagem profissional em português
- Se identifique como Orbit
- Nunca invente dados críticos (CPF, valores, etc.)
- Adapte a análise ao contexto da página`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pageContext, pageData, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Página atual: ${pageContext}

Dados da página:
${pageData}

Informações do contexto:
${JSON.stringify(context)}

Analise TUDO acima e forneça sua análise completa nos 3 blocos (Corrigido, Otimizado, Sugestões).`;

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
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
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
    console.error("orbit-ai-resolve error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
