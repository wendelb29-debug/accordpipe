import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { geminiChatCompletion } from "../_shared/gemini.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const _auth = await requireAuth(req, corsHeaders);
  if (_auth instanceof Response) return _auth;

  try {
    const { userName, goal, snapshots, totalGanhos, totalPerdas, avgScore, workspaceContext, workspaceKpis } = await req.json();


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
Responda SEMPRE em JSON válido com as chaves: diagnostico, sugestoes, meta_recuperacao, data_reavaliacao.
- diagnostico: texto curto descrevendo a situação atual
- sugestoes: lista de 3-5 ações práticas separadas por quebra de linha
- meta_recuperacao: meta específica e mensurável
- data_reavaliacao: data ISO (YYYY-MM-DD) sugerida para reavaliação (geralmente 7 dias à frente)
Seja direto, assertivo e focado em resultado. Retorne APENAS o JSON, sem texto adicional.`;

    const userPrompt = `Colaborador: ${userName}
${metaInfo}
Total Ganhos: ${totalGanhos}
Total Perdas: ${totalPerdas}
Score Médio: ${avgScore}

Snapshots recentes:
${snapInfo}

Gere o diagnóstico e plano de ação em JSON.`;

    const response = await geminiChatCompletion(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      },
      corsHeaders,
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(text, {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const result = JSON.parse(content);


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
