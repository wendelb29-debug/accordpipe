import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  MessageSquare, Send, Sparkles, PauseCircle, PlayCircle, User, Bot,
  CalendarCheck2, X, Loader2, AlertTriangle, Thermometer, Flame, Check, CheckCheck, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Lead = any;
type Msg = any;

const STATUS_COLORS: Record<string, string> = {
  aguardando_inicio: "bg-slate-500/15 text-slate-300",
  em_cadencia: "bg-blue-500/15 text-blue-400",
  respondeu: "bg-cyan-500/15 text-cyan-400",
  negociando: "bg-violet-500/15 text-violet-400",
  objecao: "bg-amber-500/15 text-amber-400",
  agendar: "bg-emerald-500/15 text-emerald-400",
  reuniao_marcada: "bg-emerald-500/20 text-emerald-400",
  precisa_humano: "bg-rose-500/20 text-rose-400",
  pausado: "bg-zinc-500/15 text-zinc-300",
  opt_out: "bg-red-500/15 text-red-400",
  perdido: "bg-gray-500/15 text-gray-400",
  ganho: "bg-emerald-500/20 text-emerald-400",
};
const STATUS_LABEL: Record<string, string> = {
  aguardando_inicio: "Aguardando início", em_cadencia: "Em cadência",
  respondeu: "Respondeu", negociando: "Negociando", objecao: "Objeção",
  agendar: "Agendar", reuniao_marcada: "Reunião marcada",
  precisa_humano: "Precisa humano", pausado: "Pausado", opt_out: "Opt-out",
  perdido: "Perdido", ganho: "Ganho",
};

function fmtTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
}
function fmtRelative(ts?: string | null) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}
function fmtFuture(ts?: string | null) {
  if (!ts) return null;
  const diff = new Date(ts).getTime() - Date.now();
  if (diff <= 0) return "agora";
  const m = Math.ceil(diff / 60000);
  if (m < 60) return `em ${m} min`;
  return `em ${Math.floor(m / 60)}h`;
}

function MessageStatus({ status }: { status?: string }) {
  if (status === "read") return <CheckCheck className="h-3 w-3 text-blue-400" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 opacity-60" />;
  if (status === "sent") return <Check className="h-3 w-3 opacity-60" />;
  if (status === "failed") return <AlertTriangle className="h-3 w-3 text-rose-400" />;
  if (status === "sending") return <Loader2 className="h-3 w-3 animate-spin opacity-60" />;
  return null;
}

export default function PulseLiveChatTab({ companyId, campaignId }: { companyId: string; campaignId: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);
  const [crmLead, setCrmLead] = useState<any>(null);
  const [manualText, setManualText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionMeta, setSuggestionMeta] = useState<any>(null);
  const [filter, setFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load leads in campaign
  const reloadLeads = async () => {
    if (!campaignId) { setLeads([]); return; }
    const { data } = await supabase.from("pulse_outbound_leads" as any)
      .select("*, crm_leads(company_name, contact_name, phone, email, lost_reason, value_mrr, notes, lead_source)")
      .eq("campaign_id", campaignId)
      .order("updated_at", { ascending: false }).limit(200);
    setLeads((data as any) || []);
  };
  useEffect(() => { reloadLeads(); /* eslint-disable-next-line */ }, [campaignId]);

  // Realtime: pulse_outbound_leads updates for this campaign
  useEffect(() => {
    if (!campaignId) return;
    const ch = supabase.channel(`pulse-leads-${campaignId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "pulse_outbound_leads", filter: `campaign_id=eq.${campaignId}` },
        (payload: any) => {
          setLeads((prev) => {
            const r = payload.new || payload.old;
            if (!r) return prev;
            if (payload.eventType === "DELETE") return prev.filter((l) => l.id !== r.id);
            const idx = prev.findIndex((l) => l.id === r.id);
            if (idx >= 0) {
              const next = [...prev]; next[idx] = { ...next[idx], ...payload.new };
              return next;
            }
            return [{ ...r }, ...prev];
          });
          if (selectedId && payload.new?.id === selectedId) setLead((p: any) => ({ ...p, ...payload.new }));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [campaignId, selectedId]);

  // Load selected lead + messages + realtime
  useEffect(() => {
    if (!selectedId) { setLead(null); setMessages([]); setCrmLead(null); return; }
    (async () => {
      const { data: l } = await supabase.from("pulse_outbound_leads" as any)
        .select("*, crm_leads(*)").eq("id", selectedId).maybeSingle();
      setLead(l as any);
      setCrmLead((l as any)?.crm_leads || null);
      const contactId = (l as any)?.whatsapp_contact_id;
      if (contactId) {
        const { data: msgs } = await supabase.from("whatsapp_messages")
          .select("*").eq("contact_id", contactId).order("created_at", { ascending: true }).limit(200);
        setMessages((msgs as any) || []);
      } else {
        setMessages([]);
      }
    })();

    const lead = leads.find((x) => x.id === selectedId);
    const contactId = lead?.whatsapp_contact_id;
    if (!contactId) return;

    const ch = supabase.channel(`pulse-msgs-${contactId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "whatsapp_messages", filter: `contact_id=eq.${contactId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") setMessages((p) => [...p, payload.new]);
          else if (payload.eventType === "UPDATE") setMessages((p) => p.map((m) => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }).subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, lead?.ai_typing]);

  const filteredLeads = useMemo(() => {
    const f = filter.toLowerCase();
    return leads.filter((l) => {
      if (!f) return true;
      const t = `${l.crm_leads?.company_name || ""} ${l.crm_leads?.contact_name || ""} ${l.crm_leads?.phone || ""}`.toLowerCase();
      return t.includes(f);
    });
  }, [leads, filter]);

  // Actions
  const updateLead = async (patch: any) => {
    if (!selectedId) return;
    const { error } = await supabase.from("pulse_outbound_leads" as any).update(patch).eq("id", selectedId);
    if (error) toast.error(error.message);
    else setLead((p: any) => ({ ...p, ...patch }));
  };

  const sendManual = async () => {
    if (!manualText.trim() || !lead || !companyId) return;
    setAiBusy(true);
    try {
      // ensure contact exists
      let contactId = lead.whatsapp_contact_id;
      const phone = (crmLead?.phone || "").replace(/\D/g, "");
      if (!phone) { toast.error("Lead sem telefone"); return; }
      if (!contactId) {
        const { data: existing } = await supabase.from("whatsapp_contacts")
          .select("id").eq("company_id", companyId).eq("phone", phone).maybeSingle();
        if (existing?.id) contactId = existing.id;
        else {
          const { data: c } = await supabase.from("whatsapp_contacts").insert({
            company_id: companyId, name: crmLead?.contact_name || crmLead?.company_name || "Lead Pulse",
            phone, lead_id: crmLead?.id ?? null, labels: ["pulse", "outbound"], conversation_status: "em_atendimento",
          }).select().single();
          contactId = c?.id;
        }
        await updateLead({ whatsapp_contact_id: contactId });
      }
      const { data: msg } = await supabase.from("whatsapp_messages").insert({
        company_id: companyId, contact_id: contactId, phone, message: manualText,
        direction: "outbound", status: "sending", message_type: "text",
        pulse_source: "operator", pulse_lead_id: lead.id, pulse_campaign_id: campaignId, ai_generated: false,
      }).select().single();
      const res = await supabase.functions.invoke("whatsapp-send", {
        body: { tenant_id: companyId, phone, text: manualText, message_id: msg?.id, message_type: "text" },
      });
      if ((res as any).error) {
        await supabase.from("whatsapp_messages").update({ status: "failed" }).eq("id", msg?.id);
        toast.error("Falha no envio");
      } else {
        setManualText("");
      }
    } finally { setAiBusy(false); }
  };

  const generateSuggestion = async () => {
    if (!lead || !campaignId) return;
    setAiBusy(true); setSuggestion(null); setSuggestionMeta(null);
    try {
      const [{ data: campaign }, { data: settings }, { data: kb }] = await Promise.all([
        supabase.from("pulse_campaigns" as any).select("*").eq("id", campaignId).maybeSingle(),
        supabase.from("pulse_agent_settings" as any).select("*").eq("campaign_id", campaignId).maybeSingle(),
        supabase.from("pulse_knowledge_base" as any).select("*").eq("campaign_id", campaignId).eq("is_active", true),
      ]);
      const recent = messages.slice(-12).map((m) => ({ direction: m.direction, message: m.message, created_at: m.created_at }));
      const res = await supabase.functions.invoke("accord-pulse-agent", {
        body: {
          action: "generate_suggestion",
          campaign, settings, knowledgeBase: kb,
          lead: crmLead, pulseLead: lead,
          recentMessages: recent, internalAiNote: lead.internal_ai_note,
        },
      });
      const d: any = (res as any).data;
      if (d?.message) { setSuggestion(d.message); setSuggestionMeta(d); }
      else toast.error("IA não retornou sugestão");
    } catch (e: any) { toast.error(e.message); } finally { setAiBusy(false); }
  };

  const sendSuggestion = async () => {
    if (!suggestion) return;
    setManualText(suggestion);
    setSuggestion(null);
    setTimeout(() => sendManual(), 50);
  };

  if (!campaignId) {
    return <Card><CardContent className="p-12 text-center text-muted-foreground">Selecione uma campanha para ver as negociações ao vivo.</CardContent></Card>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_320px] gap-3 h-[calc(100vh-260px)] min-h-[560px]">
      {/* Column 1: Leads list */}
      <Card className="overflow-hidden flex flex-col">
        <div className="p-2 border-b border-border/40">
          <Input placeholder="Buscar lead..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8" />
        </div>
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border/40">
            {filteredLeads.map((l) => {
              const status = l.status as string;
              const isSel = l.id === selectedId;
              return (
                <button key={l.id} onClick={() => setSelectedId(l.id)}
                  className={cn("w-full text-left p-3 hover:bg-muted/40 transition", isSel && "bg-muted/60")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{l.crm_leads?.company_name || "—"}</div>
                      <div className="text-xs text-muted-foreground truncate">{l.crm_leads?.contact_name || ""} {l.crm_leads?.phone ? `• ${l.crm_leads.phone}` : ""}</div>
                    </div>
                    {l.ai_typing && <Loader2 className="h-3 w-3 animate-spin text-emerald-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Badge className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[status] || "bg-muted")}>{STATUS_LABEL[status] || status}</Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Thermometer className="h-2.5 w-2.5" />{l.temperature ?? 0}°</span>
                    {l.needs_human && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">humano</Badge>}
                  </div>
                </button>
              );
            })}
            {!filteredLeads.length && <div className="p-6 text-center text-xs text-muted-foreground">Nenhum lead encontrado.</div>}
          </div>
        </ScrollArea>
      </Card>

      {/* Column 2: Chat */}
      <Card className="overflow-hidden flex flex-col">
        {!lead ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center"><MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" /><div>Selecione um lead</div></div>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-border/40 flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{crmLead?.company_name || "Lead"}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <Badge className={cn("text-[10px]", STATUS_COLORS[lead.status])}>{STATUS_LABEL[lead.status] || lead.status}</Badge>
                  <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" />{lead.temperature ?? 0}°</span>
                  {lead.next_action_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Próxima ação {fmtFuture(lead.next_action_at)}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {lead.auto_enabled ? (
                  <Button size="sm" variant="outline" onClick={() => updateLead({ auto_enabled: false, status: "pausado" })}>
                    <PauseCircle className="h-3.5 w-3.5 mr-1" />Pausar IA
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => updateLead({ auto_enabled: true, needs_human: false, status: "em_cadencia" })}>
                    <PlayCircle className="h-3.5 w-3.5 mr-1" />Retomar IA
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => updateLead({ auto_enabled: false, needs_human: false, manual_takeover_at: new Date().toISOString() })}>
                  <User className="h-3.5 w-3.5 mr-1" />Assumir
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateLead({ status: "reuniao_marcada", meeting_at: new Date().toISOString(), auto_enabled: false })}>
                  <CalendarCheck2 className="h-3.5 w-3.5 mr-1" />Reunião
                </Button>
                <Button size="sm" variant="destructive" onClick={() => updateLead({ status: "perdido", auto_enabled: false })}>
                  <X className="h-3.5 w-3.5 mr-1" />Perdido
                </Button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
              {messages.map((m) => {
                const isOut = m.direction === "outbound";
                const isAi = m.pulse_source === "ai" || m.ai_generated;
                const isOp = m.pulse_source === "operator";
                return (
                  <div key={m.id} className={cn("flex", isOut ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%] rounded-lg p-2.5 text-sm",
                      isOut ? "bg-emerald-600/20 text-foreground" : "bg-card border border-border/40")}>
                      {isOut && (
                        <div className="flex items-center gap-1 mb-1">
                          {isAi ? <Badge className="text-[9px] px-1 py-0 bg-violet-500/20 text-violet-300"><Bot className="h-2.5 w-2.5 mr-0.5" />IA</Badge>
                            : isOp ? <Badge className="text-[9px] px-1 py-0 bg-blue-500/20 text-blue-300"><User className="h-2.5 w-2.5 mr-0.5" />Operador</Badge>
                              : null}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">{m.message}</div>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-muted-foreground">
                        <span>{fmtTime(m.created_at)}</span>
                        {isOut && <MessageStatus status={m.status} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              {lead.ai_typing && (
                <div className="flex justify-end">
                  <div className="bg-violet-500/15 text-violet-300 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />IA preparando próxima mensagem...
                  </div>
                </div>
              )}
              {lead.needs_human && (
                <div className="bg-rose-500/10 text-rose-300 text-xs rounded-lg px-3 py-2 flex items-center gap-2 justify-center">
                  <AlertTriangle className="h-3 w-3" />Precisa de humano — IA pausada
                </div>
              )}
              {lead.opt_out && (
                <div className="bg-red-500/10 text-red-300 text-xs rounded-lg px-3 py-2 text-center">
                  Lead pediu para parar (opt-out) — não envie mais mensagens
                </div>
              )}
              {!messages.length && (
                <div className="text-center text-xs text-muted-foreground py-10">Nenhuma mensagem ainda</div>
              )}
            </div>

            {suggestion && (
              <div className="border-t border-border/40 p-2 bg-violet-500/5">
                <div className="text-[10px] text-violet-300 mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />Sugestão da IA (edite antes de enviar)
                  {suggestionMeta?.next_goal && <span className="text-muted-foreground">• {suggestionMeta.next_goal}</span>}
                </div>
                <Textarea rows={2} value={suggestion} onChange={(e) => setSuggestion(e.target.value)} className="text-sm" />
                <div className="flex justify-end gap-2 mt-1">
                  <Button size="sm" variant="ghost" onClick={() => setSuggestion(null)}>Descartar</Button>
                  <Button size="sm" onClick={sendSuggestion}><Send className="h-3.5 w-3.5 mr-1" />Enviar</Button>
                </div>
              </div>
            )}

            <div className="border-t border-border/40 p-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={!!lead.auto_enabled} onCheckedChange={(v) => updateLead({ auto_enabled: v })} />
                  IA pode responder automaticamente
                </Label>
                <Button size="sm" variant="outline" onClick={generateSuggestion} disabled={aiBusy}>
                  {aiBusy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  Gerar sugestão
                </Button>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Mensagem manual..." value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendManual(); } }} />
                <Button onClick={sendManual} disabled={!manualText.trim() || aiBusy}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Column 3: Context */}
      <Card className="overflow-hidden hidden xl:flex flex-col">
        {!lead ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Selecione um lead</div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3 text-sm">
              <Section title="Contexto da IA">
                <Row label="Intenção" value={lead.intent || "—"} />
                <Row label="Sentimento" value={lead.sentiment || "—"} />
                <Row label="Objeção" value={lead.last_objection || "—"} />
                <Row label="Temperatura" value={`${lead.temperature ?? 0}°`} icon={<Flame className="h-3 w-3 text-rose-400" />} />
                <Row label="Próxima ação" value={fmtFuture(lead.next_action_at) || "—"} />
                <Row label="Mensagens enviadas" value={`${lead.messages_sent ?? 0}`} />
              </Section>
              {lead.conversation_summary && (
                <Section title="Resumo da conversa">
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{lead.conversation_summary}</div>
                </Section>
              )}
              {lead.last_ai_recommendation && (
                <Section title="Última decisão da IA">
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{lead.last_ai_recommendation}</div>
                </Section>
              )}
              {lead.next_goal && (
                <Section title="Próximo objetivo">
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{lead.next_goal}</div>
                </Section>
              )}
              <Section title="Dados do lead">
                <Row label="Empresa" value={crmLead?.company_name || "—"} />
                <Row label="Contato" value={crmLead?.contact_name || "—"} />
                <Row label="Telefone" value={crmLead?.phone || "—"} />
                <Row label="Email" value={crmLead?.email || "—"} />
                <Row label="Origem" value={crmLead?.lead_source || "—"} />
                <Row label="Valor" value={crmLead?.value_mrr ? `R$ ${Number(crmLead.value_mrr).toLocaleString("pt-BR")}` : "—"} />
                <Row label="Motivo descarte" value={crmLead?.lost_reason || "—"} />
                {crmLead?.notes && <Row label="Notas" value={crmLead.notes} />}
              </Section>
              <Section title="Nota interna para IA">
                <Textarea rows={3} value={lead.internal_ai_note || ""}
                  placeholder="Ex: este lead já está em outro processo, foque em agendar."
                  onChange={(e) => setLead((p: any) => ({ ...p, internal_ai_note: e.target.value }))}
                  onBlur={(e) => updateLead({ internal_ai_note: e.target.value })} />
                <div className="text-[10px] text-muted-foreground mt-1">Salvo automaticamente ao sair do campo. Entra no próximo prompt da IA.</div>
              </Section>
              <Section title="Última atividade">
                <Row label="Última inbound" value={fmtRelative(lead.last_inbound_at)} />
                <Row label="Última outbound" value={fmtRelative(lead.last_outbound_at)} />
              </Section>
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ label, value, icon }: any) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium flex items-center gap-1 break-words">{icon}{value}</span>
    </div>
  );
}
