import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play, Pause, CalendarCheck2, XCircle, MessageSquare, Bot, User2, Thermometer, Loader2, Sparkles, Send,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type PulseLead = any;

const STATUS_LABEL: Record<string, string> = {
  aguardando_inicio: "Aguardando início",
  em_cadencia: "Em cadência",
  respondeu: "Respondeu",
  negociando: "Negociando",
  objecao: "Objeção",
  agendar: "Agendar",
  reuniao_marcada: "Reunião marcada",
  ganho: "Ganho",
  perdido: "Perdido",
  pausado: "Pausado",
  precisa_humano: "Precisa humano",
  opt_out: "Opt-out",
  queued: "Na fila",
  warming: "Aquecendo",
  meeting: "Reunião",
  won: "Ganho",
  lost: "Perdido",
  paused: "Pausado",
};

const STATUS_COLOR: Record<string, string> = {
  aguardando_inicio: "bg-slate-500/15 text-slate-300",
  em_cadencia: "bg-orange-500/15 text-orange-400",
  respondeu: "bg-blue-500/15 text-blue-400",
  negociando: "bg-amber-500/15 text-amber-400",
  objecao: "bg-rose-500/15 text-rose-400",
  agendar: "bg-emerald-500/15 text-emerald-400",
  reuniao_marcada: "bg-emerald-500/20 text-emerald-300",
  ganho: "bg-emerald-500/25 text-emerald-200",
  perdido: "bg-slate-500/15 text-slate-400",
  pausado: "bg-zinc-500/15 text-zinc-400",
  precisa_humano: "bg-yellow-500/20 text-yellow-300",
  opt_out: "bg-red-500/20 text-red-300",
};

interface Props {
  companyId: string | null;
  campaignId: string;
  campaign: any;
}

export default function PulseQueueTab({ companyId, campaignId, campaign }: Props) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<PulseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const refresh = async () => {
    if (!campaignId) return;
    setLoading(true);
    const { data } = await supabase
      .from("pulse_outbound_leads" as any)
      .select("*, crm_leads(*)")
      .eq("campaign_id", campaignId)
      .order("next_action_at", { ascending: true, nullsFirst: false })
      .limit(200);
    setLeads((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [campaignId]);

  const updateLead = async (id: string, patch: any, msg?: string) => {
    const { error } = await supabase.from("pulse_outbound_leads" as any).update(patch).eq("id", id);
    if (error) toast.error("Erro: " + error.message);
    else { if (msg) toast.success(msg); refresh(); }
  };

  const generateAI = async (p: PulseLead) => {
    setAiLoading(p.id);
    try {
      const { data: settings } = await supabase
        .from("pulse_agent_settings" as any).select("*").eq("campaign_id", campaignId).maybeSingle();
      const { data: recent } = await supabase
        .from("whatsapp_messages").select("direction, message, created_at")
        .eq("contact_id", p.whatsapp_contact_id || "00000000-0000-0000-0000-000000000000")
        .order("created_at", { ascending: false }).limit(10);
      const { data, error } = await supabase.functions.invoke("accord-pulse-agent", {
        body: {
          action: "generate_next_message",
          campaign,
          settings,
          lead: p.crm_leads,
          pulseLead: p,
          recentMessages: (recent || []).reverse(),
        },
      });
      if (error) throw error;
      setDrafts((prev) => ({ ...prev, [p.id]: data?.message || "" }));
      toast.success("Mensagem sugerida");
    } catch (e: any) {
      toast.error("Erro IA: " + e?.message);
    } finally {
      setAiLoading(null);
    }
  };

  const sendNow = async (p: PulseLead) => {
    if (!companyId) return;
    const text = (drafts[p.id] ?? p.next_message ?? "").trim();
    if (!text) { toast.error("Escreva ou gere a mensagem antes"); return; }
    const lead = p.crm_leads;
    let phone = (lead?.phone || "").replace(/\D/g, "");
    if (phone.length === 11 || phone.length === 10) phone = "55" + phone;
    if (!phone) { toast.error("Lead sem telefone"); return; }
    setSending(p.id);
    try {
      let contactId = p.whatsapp_contact_id;
      if (!contactId) {
        const { data: ex } = await supabase.from("whatsapp_contacts").select("id")
          .eq("company_id", companyId).eq("phone", phone).maybeSingle();
        contactId = ex?.id;
        if (!contactId) {
          const { data: c } = await supabase.from("whatsapp_contacts").insert({
            company_id: companyId, name: lead?.contact_name || lead?.company_name || "Lead Pulse",
            phone, lead_id: lead?.id ?? null, labels: ["pulse", "outbound"], conversation_status: "fila",
          } as any).select().single();
          contactId = c?.id;
        }
        await supabase.from("pulse_outbound_leads" as any).update({ whatsapp_contact_id: contactId }).eq("id", p.id);
      }
      const { data: msg } = await supabase.from("whatsapp_messages").insert({
        company_id: companyId, contact_id: contactId, phone, message: text,
        direction: "outbound", status: "sending", message_type: "text",
        metadata: { source: "accord_pulse_manual", pulse_lead_id: p.id, campaign_id: campaignId },
      } as any).select().single();
      const { data: sendData, error: sendErr } = await supabase.functions.invoke("whatsapp-send", {
        body: { tenant_id: companyId, phone, text, message_id: msg?.id, message_type: "text" },
      });
      if (sendErr || !sendData?.success) {
        await supabase.from("whatsapp_messages").update({ status: "failed" } as any).eq("id", msg?.id);
        throw new Error(sendData?.message || sendErr?.message || "Falha");
      }
      await supabase.from("pulse_outbound_leads" as any).update({
        status: "em_cadencia",
        messages_sent: (p.messages_sent || 0) + 1,
        attempts: (p.attempts || 0) + 1,
        last_outbound_at: new Date().toISOString(),
        last_sent_at: new Date().toISOString(),
        next_message: null,
      }).eq("id", p.id);
      setDrafts((prev) => { const cp = { ...prev }; delete cp[p.id]; return cp; });
      toast.success("Enviado");
      refresh();
    } catch (e: any) {
      toast.error("Erro: " + e?.message);
    } finally { setSending(null); }
  };

  const openInbox = (p: PulseLead) => {
    if (!p.whatsapp_contact_id) { toast.error("Sem conversa associada ainda"); return; }
    navigate(`/atendimento?contact=${p.whatsapp_contact_id}`);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!leads.length) return (
    <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
      Nenhum lead nessa campanha. Importe leads na aba "Importar leads" ou adicione descartados.
    </CardContent></Card>
  );

  return (
    <div className="space-y-3">
      {leads.map((p) => {
        const lead = p.crm_leads || {};
        const draft = drafts[p.id] ?? p.next_message ?? "";
        const statusColor = STATUS_COLOR[p.status] || "bg-muted text-muted-foreground";
        return (
          <Card key={p.id} className={p.needs_human ? "border-yellow-500/40" : p.opt_out ? "border-red-500/40 opacity-70" : ""}>
            <CardContent className="p-4 space-y-3">
              {/* header */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{lead.company_name || lead.contact_name || "—"}</span>
                    <Badge className={`text-[10px] ${statusColor}`}>{STATUS_LABEL[p.status] || p.status}</Badge>
                    {p.auto_enabled && !p.opt_out && !p.needs_human ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        <Bot className="h-3 w-3 mr-1" />Automático
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        <User2 className="h-3 w-3 mr-1" />Manual
                      </Badge>
                    )}
                    {p.intent && <Badge variant="outline" className="text-[10px]">intent: {p.intent}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {lead.contact_name || "—"} • {lead.phone || "sem telefone"}
                  </div>
                  {p.last_objection && (
                    <div className="text-xs text-rose-400 mt-1">Última objeção: {p.last_objection}</div>
                  )}
                  {p.conversation_summary && (
                    <div className="text-xs text-muted-foreground italic mt-1 line-clamp-2">"{p.conversation_summary}"</div>
                  )}
                </div>

                <div className="w-full sm:w-56">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" />Temperatura</span>
                    <span className="font-mono">{p.temperature}°</span>
                  </div>
                  <Progress value={p.temperature} className="h-2" />
                  <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                    <div>Enviadas: {p.messages_sent || 0} • Tentativas: {p.attempts || 0}</div>
                    <div>Último contato: {p.last_outbound_at || p.last_sent_at ? new Date(p.last_outbound_at || p.last_sent_at).toLocaleString("pt-BR") : "—"}</div>
                    {p.next_action_at && (
                      <div>Próxima ação: {new Date(p.next_action_at).toLocaleString("pt-BR")}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* draft + actions */}
              {(p.status !== "ganho" && p.status !== "perdido" && p.status !== "opt_out") && (
                <Textarea
                  rows={2}
                  placeholder="Próxima mensagem (gere com IA ou escreva)..."
                  value={draft}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                />
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => generateAI(p)} disabled={aiLoading === p.id}>
                  {aiLoading === p.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  IA
                </Button>
                <Button size="sm" onClick={() => sendNow(p)} disabled={sending === p.id}>
                  {sending === p.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                  Enviar agora
                </Button>
                <Button variant="ghost" size="sm" onClick={() => updateLead(p.id, { auto_enabled: !p.auto_enabled }, p.auto_enabled ? "Automático pausado" : "Automático retomado")}>
                  {p.auto_enabled ? <><Pause className="h-3.5 w-3.5 mr-1" />Pausar auto</> : <><Play className="h-3.5 w-3.5 mr-1" />Retomar auto</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => updateLead(p.id, { needs_human: !p.needs_human, auto_enabled: false }, "Atualizado")}>
                  <User2 className="h-3.5 w-3.5 mr-1" />Assumir
                </Button>
                <Button variant="ghost" size="sm" className="text-emerald-500"
                  onClick={() => updateLead(p.id, { status: "reuniao_marcada", auto_enabled: false, meeting_at: new Date().toISOString() }, "Reunião marcada")}>
                  <CalendarCheck2 className="h-3.5 w-3.5 mr-1" />Reunião
                </Button>
                <Button variant="ghost" size="sm" className="text-rose-500"
                  onClick={() => updateLead(p.id, { status: "perdido", auto_enabled: false }, "Marcado como perdido")}>
                  <XCircle className="h-3.5 w-3.5 mr-1" />Perdido
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openInbox(p)}>
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />Inbox
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
