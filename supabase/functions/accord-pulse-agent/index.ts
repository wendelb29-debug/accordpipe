import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type Stage = "abertura" | "dor" | "prova" | "objecao" | "agenda";

const NEXT_STAGE: Record<Stage, Stage> = {
  abertura: "dor",
  dor: "prova",
  prova: "objecao",
  objecao: "agenda",
  agenda: "agenda",
};

const FALLBACK: Record<Stage, string> = {
  abertura: "Oi {nome}, tudo bem? Sou da {empresa_origem}. Faz um tempo que conversamos sobre {oferta}. Posso te fazer uma pergunta rápida pra entender se faz sentido retomar?",
  dor: "Hoje, o que mais te trava em {tema}? Pergunto porque já vi cenários parecidos virarem rápido com pequenos ajustes.",
  prova: "Recentemente ajudamos um caso parecido a destravar resultado em poucas semanas, sem reformar processo. Quer que eu te mande um resumo curto?",
  objecao: "Faz sentido a sua hesitação. Posso te mostrar como contornamos isso em 15 min, sem compromisso?",
  agenda: "Topa uma conversa rápida de 15 min essa semana? Posso sugerir dois horários: amanhã 10h ou quinta 16h. Qual fica melhor?",
};

function fillFallback(text: string, lead: any, campaign: any) {
  return text
    .replaceAll("{nome}", lead?.contact_name || lead?.company_name || "tudo bem")
    .replaceAll("{empresa_origem}", campaign?.name || "nosso time")
    .replaceAll("{oferta}", campaign?.offer || "o que conversamos")
    .replaceAll("{tema}", campaign?.objective || "esse tema");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { campaign, lead, pulseLead } = await req.json();
    const currentStage: Stage = (pulseLead?.stage as Stage) || "abertura";
    const nextStage: Stage = NEXT_STAGE[currentStage] ?? "abertura";

    // Fallback if no AI key
    if (!LOVABLE_API_KEY) {
      const msg = fillFallback(FALLBACK[currentStage], lead, campaign);
      return new Response(
        JSON.stringify({
          message: msg,
          stage: nextStage,
          temperature: Math.min(100, (pulseLead?.temperature ?? 15) + 12),
          intent: currentStage === "agenda" ? "schedule" : "open",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const system = `Você é o Accord Pulse, um agente comercial de outbound por WhatsApp. Gere UMA mensagem curta, natural e humana para reativar leads descartados. Não diga que é IA. Não use tom de disparo em massa. Não prometa desconto, resultado ou prazo que não esteja no contexto. Máximo 420 caracteres. Avance a conversa conforme a etapa: abertura, dor, prova, objeção, agenda. O objetivo final é marcar uma reunião curta sem pressionar.

Responda ESTRITAMENTE em JSON válido com os campos:
{"message": string, "stage": "abertura|dor|prova|objecao|agenda", "temperature": number (0-100), "intent": "open|diagnose|proof|objection|schedule"}`;

    const userPrompt = `Campanha: ${JSON.stringify({
      nome: campaign?.name,
      objetivo: campaign?.objective,
      oferta: campaign?.offer,
      tom: campaign?.tone,
    })}
Lead: ${JSON.stringify({
      empresa: lead?.company_name,
      contato: lead?.contact_name,
      motivo_descarte: lead?.lost_reason,
      cidade: lead?.cidade,
    })}
Estado atual: etapa=${currentStage}, temperatura=${pulseLead?.temperature ?? 15}, tentativas=${pulseLead?.attempts ?? 0}, ultima_objecao=${pulseLead?.last_objection ?? "nenhuma"}
Gere a próxima mensagem para WhatsApp.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[accord-pulse-agent] AI error", aiRes.status, errText);
      const msg = fillFallback(FALLBACK[currentStage], lead, campaign);
      return new Response(
        JSON.stringify({
          message: msg,
          stage: nextStage,
          temperature: Math.min(100, (pulseLead?.temperature ?? 15) + 12),
          intent: "open",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { message: content };
    }

    const out = {
      message: (parsed.message || fillFallback(FALLBACK[currentStage], lead, campaign)).toString().slice(0, 600),
      stage: (parsed.stage as Stage) || nextStage,
      temperature: typeof parsed.temperature === "number"
        ? Math.max(0, Math.min(100, Math.round(parsed.temperature)))
        : Math.min(100, (pulseLead?.temperature ?? 15) + 12),
      intent: parsed.intent || "open",
    };

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[accord-pulse-agent] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
