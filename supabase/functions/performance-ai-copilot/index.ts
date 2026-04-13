import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userName, goal, snapshots, totalGanhos, totalPerdas, avgScore, workspaceContext, workspaceKpis } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const metaInfo = goal
      ? `Meta: R$${goal.meta}, Realizado: R$${goal.realizado}, Percentual: ${goal.percentual}%`
      : "Sem meta definida para o período";

    const snapInfo = snapshots && snapshots.length > 0
      ? snapshots.map((s: any) => `${s.data}: ganhos=${s.ganhos}, perdas=${s.perdas}, conversão=${s.conversao}%, score=${s.score}`).join("\n")
      : "Sem snapshots disponíveis";

    const wsContext = workspaceContext
      ? `\nContexto do Workspace: ${workspaceContext}`
      : "";

    const kpiInfo = workspaceKpis && workspaceKpis.length > 0
      ? `\nKPIs do Workspace: ${workspaceKpis.map((k: any) => `${k.nome} (${k.tipo}, origem: ${k.origem})`).join(", ")}`
      : "";

    const systemPrompt = `Você é o Accord Performance Copilot, um analista de performance universal de alto nível.
Analise os dados do colaborador e gere um diagnóstico preciso, plano de ação concreto e meta de recuperação.
Adapte sua análise ao contexto do workspace e seus KPIs específicos.${wsContext}${kpiInfo}
Responda SEMPRE em JSON com as chaves: diagnostico, sugestoes, meta_recuperacao, data_reavaliacao.
- diagnostico: texto curto descrevendo a situação atual
- sugestoes: lista de 3-5 ações práticas separadas por quebra de linha
- meta_recuperacao: meta específica e mensurável
- data_reavaliacao: data ISO (YYYY-MM-DD) sugerida para reavaliação (geralmente 7 dias à frente)
Seja direto, assertivo e focado em resultado.`;

    const userPrompt = `Colaborador: ${userName}
${metaInfo}
Total Ganhos: ${totalGanhos}
Total Perdas: ${totalPerdas}
Score Médio: ${avgScore}

Snapshots recentes:
${snapInfo}

Gere o diagnóstico e plano de ação em JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_action_plan",
              description: "Generate a performance action plan",
              parameters: {
                type: "object",
                properties: {
                  diagnostico: { type: "string", description: "Current performance diagnosis" },
                  sugestoes: { type: "string", description: "Action items separated by newlines" },
                  meta_recuperacao: { type: "string", description: "Recovery goal" },
                  data_reavaliacao: { type: "string", description: "Reassessment date in YYYY-MM-DD format" },
                },
                required: ["diagnostico", "sugestoes", "meta_recuperacao", "data_reavaliacao"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_action_plan" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content as JSON
      const content = data.choices?.[0]?.message?.content || "{}";
      result = JSON.parse(content);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Performance AI Copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
