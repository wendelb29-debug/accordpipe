import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type GenerateInput = {
  campaign: any;
  settings: any;
  lead: any;
  pulseLead: any;
  recentMessages?: Array<{ direction: string; message: string; created_at: string }>;
};

type ClassifyInput = {
  inboundMessage: string;
  lead: any;
  pulseLead: any;
  recentMessages?: Array<{ direction: string; message: string; created_at: string }>;
};

const FALLBACK_BY_STATUS: Record<string, string> = {
  aguardando_inicio: "Oi {nome}, tudo bem? Faz um tempo que conversamos sobre {oferta}. Posso te fazer uma pergunta rápida pra entender se ainda faz sentido?",
  em_cadencia: "Oi {nome}, voltando aqui rapidinho. O que mais te trava hoje em {tema}? Pergunto sem compromisso.",
  negociando: "Faz sentido. Posso te mostrar em 10 min como já resolvemos isso em casos parecidos. Quer marcar?",
  objecao: "Entendo perfeitamente. Posso te explicar como contornamos isso normalmente — em 10 min, sem compromisso.",
  agendar: "Topa uma conversa rápida de 10 min essa semana? Posso sugerir amanhã 10h ou quinta 16h. Qual fica melhor?",
};

function fillFallback(text: string, lead: any, campaign: any) {
  return text
    .replaceAll("{nome}", lead?.contact_name || lead?.company_name || "tudo bem")
    .replaceAll("{empresa_origem}", campaign?.name || "nosso time")
    .replaceAll("{oferta}", campaign?.offer || "o que conversamos")
    .replaceAll("{tema}", campaign?.objective || "esse tema");
}

async function callAi(system: string, user: string, model = "google/gemini-2.5-flash") {
  if (!LOVABLE_API_KEY) throw new Error("no_ai_key");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ai_${res.status}: ${t}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { message: content };
  }
}

// ─────────────────────────────────────────────
// ACTION: generate_next_message
// ─────────────────────────────────────────────
async function generateNextMessage(input: GenerateInput) {
  const { campaign, settings, lead, pulseLead, recentMessages } = input;
  const currentStatus: string = pulseLead?.status || "aguardando_inicio";

  const system = `Você é o Accord Pulse, um agente comercial de outbound por WhatsApp. Escreva como um humano experiente do comercial. Mensagens curtas, naturais, sem parecer robô, máximo 420 caracteres. Não diga que é IA. Nunca prometa desconto, prazo ou resultado que não esteja explícito no playbook/oferta. Nunca mande textão. Não envie mais de uma mensagem.

Tom: ${settings?.tone || campaign?.tone || "Humano, consultivo, breve e natural."}
Oferta principal: ${settings?.main_offer || campaign?.offer || "(não informada)"}
Playbook: ${settings?.playbook || "(sem playbook detalhado)"}
Objeções conhecidas: ${settings?.known_objections || "(não informadas)"}
Instruções de agendamento: ${settings?.scheduling_instructions || "Sugerir uma reunião curta de 10-15 min."}

Regras de avanço:
- Se o lead pediu para parar, não envie nada (should_send=false, stop_reason="opt_out").
- Se demonstrou raiva ou pediu humano, marque needs_human=true e should_send=false.
- Se aceitou reunião, marque next_status="reuniao_marcada", should_send pode ser true apenas para confirmar horário.
- Se demonstrou interesse, tente puxar para o agendamento.
- Se levantou preço, faça uma resposta consultiva (não fechar preço, puxar diagnóstico).
- Se disse "sem interesse", tente uma resposta leve UMA vez; se já tentou, marque perdido + opt_out.
- Se disse "caro", quebre objeção com valor/comparação/pergunta consultiva.
- Se disse "não tenho tempo", proponha 10 min.
- Se disse "manda proposta", peça contexto mínimo ou ofereça call curta.

Responda ESTRITAMENTE em JSON válido:
{
  "message": string,
  "intent": "open|diagnose|proof|objection|schedule|confirm",
  "next_status": "aguardando_inicio|em_cadencia|negociando|objecao|agendar|reuniao_marcada|perdido|opt_out|precisa_humano",
  "temperature": number (0-100),
  "should_send": boolean,
  "needs_human": boolean,
  "stop_reason": "none|opt_out|human_request|meeting|max_attempts|not_interested",
  "reasoning": string (max 200 chars)
}`;

  const userPrompt = `Campanha: ${JSON.stringify({
    nome: campaign?.name,
    objetivo: campaign?.objective,
  })}
Lead: ${JSON.stringify({
    empresa: lead?.company_name,
    contato: lead?.contact_name,
    motivo_descarte: lead?.lost_reason,
    cidade: lead?.cidade,
    estado: lead?.estado,
  })}
Estado atual: status=${currentStatus}, temperatura=${pulseLead?.temperature ?? 15}, mensagens_enviadas=${pulseLead?.messages_sent ?? 0}, ultima_objecao=${pulseLead?.last_objection ?? "nenhuma"}, intent=${pulseLead?.intent ?? "—"}, resumo=${pulseLead?.conversation_summary ?? "—"}
Últimas mensagens (mais antigas primeiro):
${(recentMessages || []).slice(-10).map((m) => `[${m.direction}] ${m.message}`).join("\n") || "(nenhuma)"}

Gere a próxima mensagem para WhatsApp.`;

  try {
    const parsed = await callAi(system, userPrompt);
    return {
      message: (parsed.message || fillFallback(FALLBACK_BY_STATUS[currentStatus] || FALLBACK_BY_STATUS.em_cadencia, lead, campaign)).toString().slice(0, 600),
      intent: parsed.intent || "open",
      next_status: parsed.next_status || "em_cadencia",
      temperature: typeof parsed.temperature === "number" ? Math.max(0, Math.min(100, Math.round(parsed.temperature))) : Math.min(100, (pulseLead?.temperature ?? 15) + 10),
      should_send: parsed.should_send !== false,
      needs_human: parsed.needs_human === true,
      stop_reason: parsed.stop_reason || "none",
      reasoning: (parsed.reasoning || "").toString().slice(0, 200),
    };
  } catch (e) {
    console.error("[generate_next_message] AI fallback", e);
    const msg = fillFallback(FALLBACK_BY_STATUS[currentStatus] || FALLBACK_BY_STATUS.em_cadencia, lead, campaign);
    return {
      message: msg,
      intent: "open",
      next_status: "em_cadencia",
      temperature: Math.min(100, (pulseLead?.temperature ?? 15) + 10),
      should_send: true,
      needs_human: false,
      stop_reason: "none",
      reasoning: "fallback local",
    };
  }
}

// ─────────────────────────────────────────────
// ACTION: classify_inbound
// ─────────────────────────────────────────────
async function classifyInbound(input: ClassifyInput) {
  const { inboundMessage, lead, pulseLead, recentMessages } = input;

  const system = `Você classifica respostas inbound de WhatsApp de um lead em uma cadência comercial. Responda ESTRITAMENTE em JSON válido:
{
  "intent": "interested|objection_price|objection_timing|objection_trust|objection_need|wants_human|wants_meeting|asks_price|asks_details|not_interested|opt_out|angry|unknown",
  "sentiment": "positive|neutral|negative|angry",
  "objection": string|null,
  "temperature_delta": number (-30 a +30),
  "next_status": "em_cadencia|respondeu|negociando|objecao|agendar|reuniao_marcada|perdido|opt_out|precisa_humano",
  "needs_human": boolean,
  "opt_out": boolean,
  "meeting_requested": boolean,
  "summary_update": string (max 220 chars resumindo o estado atual da conversa)
}

Regras:
- "para de me mandar mensagem", "me tira da lista", "não me chame mais" => opt_out=true, intent=opt_out.
- xingamento ou raiva => angry, needs_human=true.
- "fala com um humano", "atendente", "pessoa" => wants_human, needs_human=true.
- "podemos marcar?", "qual seu horário?", "manda o link" => wants_meeting, meeting_requested=true, next_status=reuniao_marcada.
- "muito caro", "fora do orçamento" => objection_price.
- "não tenho tempo", "depois", "ocupado" => objection_timing.
- "não conheço vocês", "tem case?" => objection_trust.
- "não preciso", "não faz sentido pra mim" => objection_need.
- "qual o preço?" => asks_price.
- "me explica melhor" => asks_details.`;

  const userPrompt = `Lead: ${JSON.stringify({ empresa: lead?.company_name, contato: lead?.contact_name })}
Estado atual: status=${pulseLead?.status}, temperatura=${pulseLead?.temperature ?? 15}, resumo=${pulseLead?.conversation_summary ?? "—"}
Últimas mensagens:
${(recentMessages || []).slice(-8).map((m) => `[${m.direction}] ${m.message}`).join("\n") || "(nenhuma)"}

Mensagem inbound do lead: "${inboundMessage}"

Classifique.`;

  try {
    const parsed = await callAi(system, userPrompt);
    return {
      intent: parsed.intent || "unknown",
      sentiment: parsed.sentiment || "neutral",
      objection: parsed.objection || null,
      temperature_delta: typeof parsed.temperature_delta === "number" ? Math.max(-30, Math.min(30, parsed.temperature_delta)) : 5,
      next_status: parsed.next_status || "respondeu",
      needs_human: parsed.needs_human === true,
      opt_out: parsed.opt_out === true,
      meeting_requested: parsed.meeting_requested === true,
      summary_update: (parsed.summary_update || "").toString().slice(0, 220),
    };
  } catch (e) {
    console.error("[classify_inbound] AI fallback", e);
    const lower = (inboundMessage || "").toLowerCase();
    const isOptOut = /(para de|me tira|n[aã]o me mande|sair da lista|unsubscribe)/i.test(lower);
    const wantsHuman = /(humano|atendente|pessoa real|falar com algu[eé]m)/i.test(lower);
    const wantsMeeting = /(marcar|agenda|reuni[aã]o|hor[aá]rio|call)/i.test(lower);
    return {
      intent: isOptOut ? "opt_out" : wantsHuman ? "wants_human" : wantsMeeting ? "wants_meeting" : "unknown",
      sentiment: "neutral",
      objection: null,
      temperature_delta: wantsMeeting ? 25 : isOptOut ? -30 : 5,
      next_status: isOptOut ? "opt_out" : wantsHuman ? "precisa_humano" : wantsMeeting ? "reuniao_marcada" : "respondeu",
      needs_human: wantsHuman,
      opt_out: isOptOut,
      meeting_requested: wantsMeeting,
      summary_update: (pulseLead?.conversation_summary || "").slice(0, 200),
    };
  }
}

// ─────────────────────────────────────────────
// ACTION: run_due_leads
// ─────────────────────────────────────────────
function isWithinWindow(settings: any): boolean {
  const now = new Date();
  const weekday = now.getDay(); // 0=sun..6=sat
  const weekdaysCfg: number[] = settings.send_weekdays || [1, 2, 3, 4, 5];
  if (!weekdaysCfg.includes(weekday)) return false;
  const hhmm = now.toTimeString().slice(0, 5);
  const start = (settings.send_window_start || "09:00").slice(0, 5);
  const end = (settings.send_window_end || "18:00").slice(0, 5);
  return hhmm >= start && hhmm <= end;
}

function randomDelayMinutes(settings: any): number {
  const min = settings.min_delay_minutes ?? 45;
  const max = settings.max_delay_minutes ?? 180;
  return Math.floor(min + Math.random() * Math.max(1, max - min));
}

function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  let p = raw.replace(/\D/g, "");
  if (p.length === 11 || p.length === 10) p = "55" + p;
  return p;
}

async function runDueLeads() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results = { campaigns_processed: 0, leads_processed: 0, messages_sent: 0, paused: 0, errors: 0 };

  const { data: activeSettings, error: sErr } = await admin
    .from("pulse_agent_settings")
    .select("*, pulse_campaigns!inner(*)")
    .eq("enabled", true);
  if (sErr) {
    console.error("[run_due_leads] settings err", sErr);
    return results;
  }

  for (const settings of activeSettings || []) {
    const campaign = (settings as any).pulse_campaigns;
    if (!campaign) continue;
    if (!isWithinWindow(settings)) continue;
    results.campaigns_processed += 1;

    // daily limit per campaign
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const { count: sentToday } = await admin
      .from("pulse_agent_events")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("event_type", "outbound_sent")
      .gte("created_at", dayStart.toISOString());
    if ((sentToday || 0) >= (settings.daily_limit || 40)) continue;
    let remainingToday = (settings.daily_limit || 40) - (sentToday || 0);

    const eligibleStatuses = ["aguardando_inicio", "em_cadencia", "negociando", "objecao", "agendar", "queued", "warming", "replied"];
    const { data: leads } = await admin
      .from("pulse_outbound_leads")
      .select("*, crm_leads(*)")
      .eq("campaign_id", campaign.id)
      .eq("auto_enabled", true)
      .eq("needs_human", false)
      .eq("opt_out", false)
      .in("status", eligibleStatuses)
      .or(`next_action_at.is.null,next_action_at.lte.${new Date().toISOString()}`)
      .order("next_action_at", { ascending: true, nullsFirst: true })
      .limit(Math.min(remainingToday, 25));

    for (const pulse of leads || []) {
      if (remainingToday <= 0) break;
      try {
        const maxAttempts = pulse.max_attempts || settings.max_attempts_per_lead || 6;
        if ((pulse.messages_sent || 0) >= maxAttempts) {
          await admin.from("pulse_outbound_leads")
            .update({ auto_enabled: false, status: "pausado" })
            .eq("id", pulse.id);
          results.paused += 1;
          continue;
        }
        // respect min_delay since last outbound
        if (pulse.last_outbound_at) {
          const diff = (Date.now() - new Date(pulse.last_outbound_at).getTime()) / 60000;
          if (diff < (settings.min_delay_minutes ?? 45)) continue;
        }

        const lead = pulse.crm_leads || {};
        const phone = normalizePhone(lead?.phone);
        if (!phone) continue;

        const { data: recentMessages } = await admin
          .from("whatsapp_messages")
          .select("direction, message, created_at")
          .eq("contact_id", pulse.whatsapp_contact_id || "00000000-0000-0000-0000-000000000000")
          .order("created_at", { ascending: false })
          .limit(10);

        const gen = await generateNextMessage({
          campaign,
          settings,
          lead,
          pulseLead: pulse,
          recentMessages: (recentMessages || []).reverse(),
        });

        if (gen.needs_human || !gen.should_send) {
          await admin.from("pulse_outbound_leads").update({
            needs_human: gen.needs_human,
            status: gen.needs_human ? "precisa_humano" : gen.next_status,
            intent: gen.intent,
            auto_enabled: gen.needs_human ? false : pulse.auto_enabled,
          }).eq("id", pulse.id);
          await admin.from("pulse_agent_events").insert({
            campaign_id: campaign.id,
            pulse_lead_id: pulse.id,
            event_type: "decision_no_send",
            ai_reasoning: gen.reasoning,
            detected_intent: gen.intent,
            metadata: { stop_reason: gen.stop_reason },
          });
          continue;
        }

        // ensure whatsapp contact
        let contactId = pulse.whatsapp_contact_id;
        if (!contactId) {
          const { data: existing } = await admin
            .from("whatsapp_contacts").select("id")
            .eq("company_id", campaign.company_id).eq("phone", phone).maybeSingle();
          if (existing?.id) contactId = existing.id;
          else {
            const { data: created } = await admin.from("whatsapp_contacts").insert({
              company_id: campaign.company_id,
              name: lead?.contact_name || lead?.company_name || "Lead Pulse",
              phone,
              lead_id: lead?.id ?? null,
              labels: ["pulse", "outbound"],
              conversation_status: "fila",
            }).select().single();
            contactId = created?.id;
          }
          await admin.from("pulse_outbound_leads").update({ whatsapp_contact_id: contactId }).eq("id", pulse.id);
        }

        // insert message
        const { data: msg } = await admin.from("whatsapp_messages").insert({
          company_id: campaign.company_id,
          contact_id: contactId,
          phone,
          message: gen.message,
          direction: "outbound",
          status: "sending",
          message_type: "text",
          metadata: { source: "accord_pulse_agent", pulse_lead_id: pulse.id, campaign_id: campaign.id },
        }).select().single();

        // dispatch via whatsapp-send
        const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            tenant_id: campaign.company_id,
            phone,
            text: gen.message,
            message_id: msg?.id,
            message_type: "text",
          }),
        });
        const sendJson = await sendRes.json().catch(() => ({}));
        const ok = sendRes.ok && (sendJson as any)?.success !== false;
        if (!ok) {
          await admin.from("whatsapp_messages").update({ status: "failed" }).eq("id", msg?.id);
          results.errors += 1;
          continue;
        }

        const nextAt = new Date(Date.now() + randomDelayMinutes(settings) * 60000).toISOString();
        await admin.from("pulse_outbound_leads").update({
          status: gen.next_status,
          intent: gen.intent,
          temperature: gen.temperature,
          attempts: (pulse.attempts || 0) + 1,
          messages_sent: (pulse.messages_sent || 0) + 1,
          last_outbound_at: new Date().toISOString(),
          last_sent_at: new Date().toISOString(),
          next_action_at: nextAt,
          next_message: null,
        }).eq("id", pulse.id);

        await admin.from("pulse_agent_events").insert({
          campaign_id: campaign.id,
          pulse_lead_id: pulse.id,
          event_type: "outbound_sent",
          direction: "outbound",
          message: gen.message,
          ai_reasoning: gen.reasoning,
          detected_intent: gen.intent,
          metadata: {},
        });

        results.messages_sent += 1;
        results.leads_processed += 1;
        remainingToday -= 1;
      } catch (err) {
        console.error("[run_due_leads] lead error", err);
        results.errors += 1;
      }
    }
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action || "generate_next_message";

    if (action === "generate_next_message") {
      const out = await generateNextMessage(body);
      return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "classify_inbound") {
      const out = await classifyInbound(body);
      return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "run_due_leads") {
      const out = await runDueLeads();
      return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[accord-pulse-agent] error", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
