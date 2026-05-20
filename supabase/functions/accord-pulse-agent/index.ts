import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type AnyObj = Record<string, any>;

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────
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
  try { return JSON.parse(content); } catch { return { message: content }; }
}

function formatKnowledgeBase(items: AnyObj[] | null | undefined): string {
  if (!items || !items.length) return "(sem materiais cadastrados)";
  return items
    .filter((k) => k.is_active !== false)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .map((k) => `### [${k.type}] ${k.title} (prioridade ${k.priority || 1})\n${k.content}`)
    .join("\n\n");
}

function isWithinWindow(settings: AnyObj): boolean {
  const now = new Date();
  const weekday = now.getDay();
  const weekdaysCfg: number[] = settings.send_weekdays || [1, 2, 3, 4, 5];
  if (!weekdaysCfg.includes(weekday)) return false;
  const hhmm = now.toTimeString().slice(0, 5);
  const start = (settings.send_window_start || "09:00").slice(0, 5);
  const end = (settings.send_window_end || "18:00").slice(0, 5);
  return hhmm >= start && hhmm <= end;
}
function isWithinDateRange(s: AnyObj): boolean {
  const now = Date.now();
  if (s.starts_at && new Date(s.starts_at).getTime() > now) return false;
  if (s.ends_at && new Date(s.ends_at).getTime() < now) return false;
  return true;
}
function randomDelayMinutes(s: AnyObj): number {
  const min = s.min_delay_minutes ?? 3;
  const max = s.max_delay_minutes ?? 12;
  return Math.floor(min + Math.random() * Math.max(1, max - min));
}
function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  let p = raw.replace(/\D/g, "");
  if (p.length === 11 || p.length === 10) p = "55" + p;
  return p;
}

// ─────────────────────────────────────────────
// generate_reply / generate_suggestion (shared)
// ─────────────────────────────────────────────
async function buildReply(input: AnyObj) {
  const { campaign, settings, lead, pulseLead, recentMessages, knowledgeBase, internalAiNote } = input;

  const system = `Você é um vendedor consultivo experiente atendendo um lead pelo WhatsApp em nome de "${campaign?.name || "nossa empresa"}".
Tom: ${settings?.tone || "Humano, consultivo, breve e natural."}.

REGRAS DE OURO:
- Você NUNCA diz que é IA, robô, automação ou bot. Você fala como humano real.
- Use APENAS informações dos materiais de apoio abaixo. Nunca invente preços, prazos, promessas, descontos, condições ou cases.
- Se faltar informação para responder com segurança, marque needs_human=true.
- Mensagens curtas (até ~380 caracteres), com a cara de WhatsApp real, sem corporativês.
- Faça UMA pergunta curta quando fizer sentido para destravar a conversa.
- Trate objeções como o material orienta (objeções/política).
- Quando perceber interesse, puxe para reunião usando exatamente as instruções dos materiais de tipo "script" ou "oferta".
- Se o lead pediu para parar, NÃO responda (should_send=false, next_status="opt_out").
- Se pediu humano/atendente ou xingou, NÃO responda (needs_human=true, should_send=false).
- Nunca mande mais de uma mensagem.

MATERIAIS DE APOIO DA CAMPANHA:
${formatKnowledgeBase(knowledgeBase)}

NOTA INTERNA DO OPERADOR PARA VOCÊ (use como prioridade nesta resposta):
${internalAiNote || "(nenhuma)"}

Responda ESTRITAMENTE em JSON válido:
{
  "message": string,
  "intent": "open|diagnose|proof|objection|schedule|confirm",
  "sentiment": "positive|neutral|negative",
  "objection": string|null,
  "temperature": number (0-100),
  "next_status": "aguardando_inicio|em_cadencia|respondeu|negociando|objecao|agendar|reuniao_marcada|perdido|opt_out|precisa_humano",
  "next_goal": string,
  "needs_human": boolean,
  "should_send": boolean,
  "reasoning": string (max 240 chars)
}`;

  const userPrompt = `Lead: ${JSON.stringify({
    empresa: lead?.company_name,
    contato: lead?.contact_name,
    motivo_descarte: lead?.lost_reason,
    valor: lead?.value_mrr,
    origem: lead?.lead_source || lead?.origem,
    observacoes: lead?.notes,
  })}
Estado atual: status=${pulseLead?.status}, temperatura=${pulseLead?.temperature ?? 15}, msgs_enviadas=${pulseLead?.messages_sent ?? 0}, intenção=${pulseLead?.intent || "—"}, objeção=${pulseLead?.last_objection || "—"}, resumo=${pulseLead?.conversation_summary || "—"}.

Histórico recente (antigas → recentes):
${(recentMessages || []).slice(-12).map((m: AnyObj) => `[${m.direction}] ${m.message}`).join("\n") || "(nenhuma)"}

Gere agora a próxima mensagem de WhatsApp.`;

  try {
    const parsed = await callAi(system, userPrompt);
    return {
      message: (parsed.message || "").toString().slice(0, 600),
      intent: parsed.intent || "open",
      sentiment: parsed.sentiment || "neutral",
      objection: parsed.objection || null,
      temperature: typeof parsed.temperature === "number" ? Math.max(0, Math.min(100, Math.round(parsed.temperature))) : Math.min(100, (pulseLead?.temperature ?? 15) + 8),
      next_status: parsed.next_status || "em_cadencia",
      next_goal: parsed.next_goal || "Avançar a conversa de forma natural",
      should_send: parsed.should_send !== false,
      needs_human: parsed.needs_human === true,
      reasoning: (parsed.reasoning || "").toString().slice(0, 240),
    };
  } catch (e) {
    console.error("[buildReply] AI error", e);
    return {
      message: "",
      intent: "open",
      sentiment: "neutral",
      objection: null,
      temperature: pulseLead?.temperature ?? 15,
      next_status: "precisa_humano",
      next_goal: "Aguardar humano",
      should_send: false,
      needs_human: true,
      reasoning: "fallback: IA indisponível, encaminhando ao humano",
    };
  }
}

// ─────────────────────────────────────────────
// classify_inbound
// ─────────────────────────────────────────────
async function classifyInbound(input: AnyObj) {
  const { inboundMessage, lead, pulseLead, recentMessages } = input;
  const system = `Você classifica respostas inbound de WhatsApp em uma negociação comercial. Responda ESTRITAMENTE em JSON válido:
{
  "intent": "interested|objection_price|objection_timing|objection_trust|objection_need|wants_human|wants_meeting|asks_price|asks_details|not_interested|opt_out|angry|unknown",
  "sentiment": "positive|neutral|negative|angry",
  "objection": string|null,
  "temperature_delta": number (-30 a +30),
  "next_status": "em_cadencia|respondeu|negociando|objecao|agendar|reuniao_marcada|perdido|opt_out|precisa_humano",
  "needs_human": boolean,
  "opt_out": boolean,
  "meeting_requested": boolean,
  "summary_update": string (max 220 chars)
}`;
  const userPrompt = `Lead: ${JSON.stringify({ empresa: lead?.company_name, contato: lead?.contact_name })}
Estado atual: status=${pulseLead?.status}, temperatura=${pulseLead?.temperature ?? 15}, resumo=${pulseLead?.conversation_summary ?? "—"}
Últimas mensagens:
${(recentMessages || []).slice(-8).map((m: AnyObj) => `[${m.direction}] ${m.message}`).join("\n") || "(nenhuma)"}

Mensagem inbound: "${inboundMessage}"
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
// run_due_leads
// ─────────────────────────────────────────────
async function runDueLeads() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results = { campaigns_processed: 0, leads_processed: 0, messages_sent: 0, paused: 0, errors: 0 };

  const { data: activeSettings } = await admin
    .from("pulse_agent_settings")
    .select("*, pulse_campaigns!inner(*)")
    .eq("enabled", true);

  for (const settings of activeSettings || []) {
    const campaign: AnyObj = (settings as AnyObj).pulse_campaigns;
    if (!campaign) continue;

    // auto pause expired campaign
    if (settings.ends_at && settings.auto_pause_on_end_date && new Date(settings.ends_at).getTime() < Date.now()) {
      await admin.from("pulse_agent_settings").update({ enabled: false }).eq("id", settings.id);
      results.paused += 1;
      continue;
    }

    if (!isWithinDateRange(settings)) continue;
    if (settings.block_outside_window && !isWithinWindow(settings)) continue;
    results.campaigns_processed += 1;

    // daily limit
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const { count: sentToday } = await admin
      .from("pulse_agent_events")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("event_type", "outbound_sent")
      .gte("created_at", dayStart.toISOString());
    let remaining = (settings.daily_limit || 40) - (sentToday || 0);
    if (remaining <= 0) continue;

    // load knowledge base once
    const { data: knowledgeBase } = await admin
      .from("pulse_knowledge_base")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("is_active", true);

    const eligible = ["aguardando_inicio", "em_cadencia", "respondeu", "negociando", "objecao", "agendar"];
    const { data: leads } = await admin
      .from("pulse_outbound_leads")
      .select("*, crm_leads(*)")
      .eq("campaign_id", campaign.id)
      .eq("auto_enabled", true)
      .eq("needs_human", false)
      .eq("opt_out", false)
      .in("status", eligible)
      .or(`next_action_at.is.null,next_action_at.lte.${new Date().toISOString()}`)
      .order("next_action_at", { ascending: true, nullsFirst: true })
      .limit(Math.min(remaining, 25));

    for (const pulse of leads || []) {
      if (remaining <= 0) break;
      try {
        const maxMsgs = settings.max_messages_per_lead ?? pulse.max_attempts ?? 8;
        if ((pulse.messages_sent || 0) >= maxMsgs) {
          await admin.from("pulse_outbound_leads")
            .update({ auto_enabled: false, status: "pausado" }).eq("id", pulse.id);
          results.paused += 1; continue;
        }
        // negotiation max days
        if (settings.max_negotiation_days && pulse.negotiation_started_at) {
          const elapsedDays = (Date.now() - new Date(pulse.negotiation_started_at).getTime()) / 86400000;
          if (elapsedDays > settings.max_negotiation_days) {
            await admin.from("pulse_outbound_leads")
              .update({ auto_enabled: false, status: "pausado" }).eq("id", pulse.id);
            results.paused += 1; continue;
          }
        }
        // first message requires approval
        if ((pulse.messages_sent || 0) === 0 && settings.require_approval_first_message && !settings.auto_start_conversations) {
          continue;
        }

        const lead = pulse.crm_leads || {};
        const phone = normalizePhone(lead?.phone);
        if (!phone) continue;

        const { data: recentMessages } = await admin
          .from("whatsapp_messages")
          .select("direction, message, created_at")
          .eq("contact_id", pulse.whatsapp_contact_id || "00000000-0000-0000-0000-000000000000")
          .order("created_at", { ascending: false }).limit(12);

        await admin.from("pulse_outbound_leads").update({ ai_typing: true }).eq("id", pulse.id);

        const gen = await buildReply({
          campaign, settings, lead, pulseLead: pulse,
          recentMessages: (recentMessages || []).reverse(),
          knowledgeBase, internalAiNote: pulse.internal_ai_note,
        });

        if (gen.needs_human || !gen.should_send) {
          await admin.from("pulse_outbound_leads").update({
            ai_typing: false,
            needs_human: gen.needs_human,
            status: gen.needs_human ? "precisa_humano" : gen.next_status,
            intent: gen.intent,
            last_ai_recommendation: gen.reasoning,
            next_goal: gen.next_goal,
            auto_enabled: gen.needs_human ? false : pulse.auto_enabled,
          }).eq("id", pulse.id);
          await admin.from("pulse_agent_events").insert({
            campaign_id: campaign.id, pulse_lead_id: pulse.id,
            event_type: "decision_no_send", ai_reasoning: gen.reasoning,
            detected_intent: gen.intent, detected_sentiment: gen.sentiment,
            next_goal: gen.next_goal,
          });
          continue;
        }

        // ensure whatsapp contact
        let contactId = pulse.whatsapp_contact_id;
        if (!contactId) {
          const { data: existing } = await admin.from("whatsapp_contacts").select("id")
            .eq("company_id", campaign.company_id).eq("phone", phone).maybeSingle();
          if (existing?.id) contactId = existing.id;
          else {
            const { data: created } = await admin.from("whatsapp_contacts").insert({
              company_id: campaign.company_id,
              name: lead?.contact_name || lead?.company_name || "Lead Pulse",
              phone, lead_id: lead?.id ?? null,
              labels: ["pulse", "outbound"], conversation_status: "fila",
            }).select().single();
            contactId = created?.id;
          }
          await admin.from("pulse_outbound_leads").update({ whatsapp_contact_id: contactId }).eq("id", pulse.id);
        }

        const { data: msg } = await admin.from("whatsapp_messages").insert({
          company_id: campaign.company_id,
          contact_id: contactId, phone, message: gen.message,
          direction: "outbound", status: "sending", message_type: "text",
          pulse_source: "ai", pulse_lead_id: pulse.id, pulse_campaign_id: campaign.id, ai_generated: true,
          metadata: { source: "accord_pulse_ai", pulse_lead_id: pulse.id, campaign_id: campaign.id },
        }).select().single();

        const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ tenant_id: campaign.company_id, phone, text: gen.message, message_id: msg?.id, message_type: "text" }),
        });
        const sendJson = await sendRes.json().catch(() => ({}));
        const ok = sendRes.ok && (sendJson as AnyObj)?.success !== false;
        if (!ok) {
          await admin.from("whatsapp_messages").update({ status: "failed" }).eq("id", msg?.id);
          await admin.from("pulse_outbound_leads").update({ ai_typing: false }).eq("id", pulse.id);
          results.errors += 1; continue;
        }

        const nextAt = new Date(Date.now() + randomDelayMinutes(settings) * 60000).toISOString();
        await admin.from("pulse_outbound_leads").update({
          ai_typing: false,
          status: gen.next_status, intent: gen.intent, temperature: gen.temperature,
          next_goal: gen.next_goal, last_ai_recommendation: gen.reasoning,
          attempts: (pulse.attempts || 0) + 1, messages_sent: (pulse.messages_sent || 0) + 1,
          last_outbound_at: new Date().toISOString(), last_sent_at: new Date().toISOString(),
          next_action_at: nextAt, next_message: null,
          negotiation_started_at: pulse.negotiation_started_at || new Date().toISOString(),
        }).eq("id", pulse.id);

        await admin.from("pulse_agent_events").insert({
          campaign_id: campaign.id, pulse_lead_id: pulse.id,
          event_type: "outbound_sent", direction: "outbound", message: gen.message,
          ai_reasoning: gen.reasoning, detected_intent: gen.intent,
          detected_sentiment: gen.sentiment, next_goal: gen.next_goal,
        });
        results.messages_sent += 1; results.leads_processed += 1; remaining -= 1;
      } catch (err) {
        console.error("[run_due_leads] lead error", err);
        await admin.from("pulse_outbound_leads").update({ ai_typing: false }).eq("id", pulse.id).then(() => {}, () => {});
        results.errors += 1;
      }
    }
  }
  return results;
}

// ─────────────────────────────────────────────
// HTTP entry
// ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action || "generate_reply";

    if (action === "generate_reply" || action === "generate_next_message") {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const campaignId = body?.campaign?.id || body?.pulseLead?.campaign_id;
      let knowledgeBase = body?.knowledgeBase;
      if (!knowledgeBase && campaignId) {
        const { data } = await admin.from("pulse_knowledge_base").select("*").eq("campaign_id", campaignId).eq("is_active", true);
        knowledgeBase = data || [];
      }
      const out = await buildReply({ ...body, knowledgeBase });
      return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "generate_suggestion") {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const campaignId = body?.campaign?.id || body?.pulseLead?.campaign_id;
      let knowledgeBase = body?.knowledgeBase;
      if (!knowledgeBase && campaignId) {
        const { data } = await admin.from("pulse_knowledge_base").select("*").eq("campaign_id", campaignId).eq("is_active", true);
        knowledgeBase = data || [];
      }
      const out = await buildReply({ ...body, knowledgeBase });
      return new Response(JSON.stringify({ ...out, should_send: false, preview_only: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[accord-pulse-agent] error", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
