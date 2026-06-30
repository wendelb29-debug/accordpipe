// SDR Operating System — Lovable AI Gateway via AI SDK
// Recebe { task, context, message, history } e responde JSON estruturado.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { generateText } from "npm:ai@7.0.9";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@3.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  task:
    | "copilot"
    | "perception"
    | "objection"
    | "closing"
    | "disc-read"
    | "outreach"
    | "sequence";
  context?: Record<string, unknown>;
  message?: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

const SYSTEM = `Você é o SDR Operating System: um copiloto de vendas consultivas em PT-BR para SDRs humanos.
Princípios:
- Nunca venda sem qualificar. Faça perguntas antes de explicar.
- Linguagem humana, curta, natural. Zero corporativês.
- Adapte tom ao perfil DISC do lead quando informado (D=direto/resultado, I=leve/conexão, S=acolhedor/segurança, C=dados/precisão).
- Sempre conduza a uma decisão simples.
Responda SEMPRE em JSON válido, sem markdown, sem cercas de código.`;

function buildPrompt(body: Body): string {
  const ctx = JSON.stringify(body.context ?? {}, null, 2);
  switch (body.task) {
    case "copilot":
      return `Tarefa: sugerir a próxima fala do SDR.
Contexto do lead:
${ctx}
Última mensagem do cliente: """${body.message ?? ""}"""
Histórico recente: ${JSON.stringify(body.history ?? []).slice(0, 4000)}

Retorne JSON:
{
  "suggested": "resposta sugerida principal (1-3 frases)",
  "alternatives": ["variação 1", "variação 2"],
  "urgency": "baixo" | "medio" | "alto",
  "intent": "qualificar" | "avancar" | "fechar",
  "reasoning": "1 frase explicando por quê"
}`;
    case "perception":
      return `Tarefa: gerar percepção de valor para este lead.
Contexto:
${ctx}

Retorne JSON:
{
  "dor": "dor principal em 1 frase",
  "impacto": "impacto no negócio em 1 frase",
  "risco": "risco financeiro ou operacional em 1 frase",
  "urgencia": "gatilho de urgência implícita em 1 frase",
  "frase_pronta": "frase pronta para o SDR falar, adaptada ao DISC informado"
}`;
    case "objection":
      return `Tarefa: responder objeção adaptando ao perfil DISC.
Contexto:
${ctx}
Objeção do cliente: """${body.message ?? ""}"""

Retorne JSON:
{
  "curta": "resposta curta (1 frase)",
  "consultiva": "resposta consultiva (faz pergunta, 2-3 frases)",
  "direta": "resposta direta (assertiva, 2-3 frases)",
  "armadilha": "o que NÃO falar com esse perfil agora"
}`;
    case "closing":
      return `Tarefa: gerar 3 sugestões de fechamento adaptadas ao DISC informado.
Contexto:
${ctx}

Retorne JSON:
{
  "leve": "fechamento leve",
  "consultivo": "fechamento consultivo",
  "direto": "fechamento direto"
}`;
    case "disc-read":
      return `Tarefa: ler o perfil DISC do lead com base nas mensagens trocadas.
Contexto:
${ctx}
Mensagens: ${JSON.stringify(body.history ?? []).slice(0, 4000)}

Retorne JSON:
{
  "perfil": "D" | "I" | "S" | "C",
  "confianca": "baixa" | "media" | "alta",
  "sinais": ["sinal 1", "sinal 2", "sinal 3"],
  "tom_ideal": "como falar com ele em 1 frase",
  "evitar": "como NÃO falar com ele em 1 frase"
}`;
    case "outreach":
      return `Tarefa: motor de conversa outbound humanizada (WhatsApp/LinkedIn/Email).
Contexto:
${ctx}
PROIBIDO soar template. Linguagem PT-BR natural, frases curtas. Variar abertura entre pergunta/observação/insight/contexto/curiosidade/referência.

Retorne SOMENTE JSON:
{
  "icp": "decisor" | "relacional" | "analitico" | "cetico",
  "temperatura": "frio" | "morno" | "quente",
  "estilo": "direto" | "emocional" | "racional" | "defensivo",
  "nivel": "leve" | "medio" | "direto",
  "intencao": "gerar_resposta" | "abrir_conversa" | "abrir_caminho_reuniao",
  "raciocinio": "1 frase",
  "principal": "mensagem principal pronta",
  "alternativas": [
    { "tipo_abertura": "pergunta", "texto": "variação 1" },
    { "tipo_abertura": "observacao", "texto": "variação 2" }
  ],
  "cta": "o CTA usado, ou vazio"
}`;
    case "sequence":
      return `Tarefa: gerar uma SEQUÊNCIA OUTBOUND HUMANIZADA de 7 dias.
Contexto:
${ctx}
Regras: PT-BR natural, sem template, aberturas diferentes a cada dia, sem "vamos agendar reunião?".
Dia 1: abertura/curiosidade. Dia 2: insight. Dia 3: pergunta direta. Dia 4: humanização. Dia 5: reativação. Dia 6: insight+impacto. Dia 7: encerramento elegante.

Retorne SOMENTE JSON:
{
  "icp": "decisor" | "relacional" | "analitico" | "cetico",
  "canal": "whatsapp" | "linkedin" | "email" | "ligacao",
  "resumo_estrategia": "1 frase",
  "dias": [
    {
      "dia": 1,
      "foco": "string",
      "objetivo": "resposta" | "reuniao" | "reativacao",
      "tom": "leve" | "medio" | "direto",
      "pressao": "baixa" | "media" | "alta",
      "tipo_abertura": "pergunta" | "observacao" | "insight" | "contexto" | "curiosidade" | "referencia" | "reativacao",
      "principal": "mensagem pronta",
      "variacoes": ["variação 1", "variação 2"]
    }
  ]
}`;
  }
}

function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.task) {
      return new Response(JSON.stringify({ error: "Missing task" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const { text } = await generateText({
      model,
      system: SYSTEM,
      prompt: buildPrompt(body),
    });

    const cleaned = text
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: text };
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    const status = /rate.?limit|429/i.test(msg)
      ? 429
      : /credit|402/i.test(msg)
      ? 402
      : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
