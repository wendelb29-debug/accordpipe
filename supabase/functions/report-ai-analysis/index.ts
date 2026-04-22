import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/require-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { currentKpis, previousKpis, reportType, periodLabel, previousPeriodLabel } = await req.json();

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um analista de dados especializado em CRM e gestão de clientes SaaS. 
Analise os KPIs comparativos entre dois períodos e gere um relatório executivo em português brasileiro.
Seja direto, objetivo e use dados numéricos. Formate com markdown.
Estrutura obrigatória:
## 📊 Resumo Executivo
(2-3 frases sobre a performance geral)

## 📈 Destaques Positivos
(bullets com métricas que melhoraram)

## ⚠️ Pontos de Atenção
(bullets com métricas que pioraram ou estagnaram)

## 💡 Recomendações
(3 ações práticas baseadas nos dados)

## 🔮 Tendência
(projeção curta baseada na variação)`;

    const userPrompt = `Analise a comparação do relatório de ${reportType === "clientes" ? "Base de Clientes" : "CRM / Vendas"}:

**Período Atual (${periodLabel}):**
${JSON.stringify(currentKpis, null, 2)}

**Período Anterior (${previousPeriodLabel}):**
${JSON.stringify(previousKpis, null, 2)}

Gere a análise comparativa completa.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Não foi possível gerar a análise.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
