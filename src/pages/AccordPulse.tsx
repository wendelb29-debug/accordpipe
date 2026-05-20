import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Flame, Sparkles, Send, Pause, Play, CalendarCheck2, Plus, ShieldCheck,
  Users, Thermometer, MessageCircle, Loader2,
} from "lucide-react";

type Campaign = {
  id: string;
  company_id: string;
  name: string;
  objective: string;
  offer: string;
  tone: string;
  status: string;
  max_daily_messages: number;
  human_delay_minutes: number;
};

type PulseLead = {
  id: string;
  campaign_id: string;
  crm_lead_id: string;
  whatsapp_contact_id: string | null;
  status: string;
  stage: string;
  temperature: number;
  attempts: number;
  last_objection: string | null;
  next_message: string | null;
  next_action_at: string | null;
  last_sent_at: string | null;
  meeting_at: string | null;
  crm_leads?: any;
};

type LostLead = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  lost_reason: string | null;
  updated_at: string;
};

function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let p = raw.replace(/\D/g, "");
  if (p.length === 11 || p.length === 10) p = "55" + p;
  return p;
}

const STAGE_LABEL: Record<string, string> = {
  abertura: "Abertura",
  dor: "Dor",
  prova: "Prova",
  objecao: "Objeção",
  agenda: "Agenda",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Na fila",
  warming: "Aquecendo",
  replied: "Respondeu",
  meeting: "Reunião",
  won: "Ganho",
  lost: "Perdido",
  paused: "Pausado",
};

export default function AccordPulse() {
  const { profile, role } = useAuth();
  const companyId = useActiveCompanyId();
  const navigate = useNavigate();

  const allowed = role === "admin" || role === "ceo" || role === "comercial" || profile?.is_master;

  useEffect(() => {
    if (role && !allowed) navigate("/home");
  }, [role, allowed, navigate]);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [lostLeads, setLostLeads] = useState<LostLead[]>([]);
  const [pulseLeads, setPulseLeads] = useState<PulseLead[]>([]);
  const [selectedLost, setSelectedLost] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [draftMessages, setDraftMessages] = useState<Record<string, string>>({});

  // New campaign form
  const [form, setForm] = useState({ name: "", objective: "", offer: "", tone: "Humano, consultivo e direto." });

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  // Load campaigns
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data, error } = await supabase
        .from("pulse_campaigns" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Erro ao carregar campanhas");
        return;
      }
      setCampaigns((data as any) || []);
      if (data && data.length && !selectedCampaignId) setSelectedCampaignId((data[0] as any).id);
    })();
  }, [companyId]);

  // Load lost leads
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("id, company_name, contact_name, phone, lost_reason, updated_at")
        .eq("servidor_id", companyId)
        .eq("lead_status", "lost")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (!error) setLostLeads((data as any) || []);
    })();
  }, [companyId]);

  // Load pulse leads for selected campaign
  const refreshPulseLeads = async () => {
    if (!selectedCampaignId) {
      setPulseLeads([]);
      return;
    }
    const { data, error } = await supabase
      .from("pulse_outbound_leads" as any)
      .select("*, crm_leads(*)")
      .eq("campaign_id", selectedCampaignId)
      .order("created_at", { ascending: false });
    if (!error) setPulseLeads((data as any) || []);
  };
  useEffect(() => {
    refreshPulseLeads();
  }, [selectedCampaignId]);

  // Metrics
  const metrics = useMemo(() => {
    const total = pulseLeads.length;
    const warming = pulseLeads.filter((p) => p.status === "warming").length;
    const meeting = pulseLeads.filter((p) => p.status === "meeting").length;
    const avgTemp = total ? Math.round(pulseLeads.reduce((s, p) => s + (p.temperature || 0), 0) / total) : 0;
    return { total, warming, meeting, avgTemp };
  }, [pulseLeads]);

  // Create campaign
  const createCampaign = async () => {
    if (!companyId) return;
    if (!form.name.trim()) {
      toast.error("Nome da campanha é obrigatório");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("pulse_campaigns" as any)
      .insert({
        company_id: companyId,
        name: form.name,
        objective: form.objective,
        offer: form.offer,
        tone: form.tone || "Humano, consultivo e direto.",
        created_by: profile?.user_id ?? null,
      } as any)
      .select()
      .single();
    setLoading(false);
    if (error) {
      toast.error("Erro ao criar campanha");
      return;
    }
    toast.success("Campanha criada");
    setForm({ name: "", objective: "", offer: "", tone: "Humano, consultivo e direto." });
    setCampaigns((prev) => [data as any, ...prev]);
    setSelectedCampaignId((data as any).id);
  };

  // Add selected lost leads to pulse
  const addToPulse = async () => {
    if (!selectedCampaignId) {
      toast.error("Selecione ou crie uma campanha primeiro");
      return;
    }
    if (!selectedLost.size) return;
    const rows = Array.from(selectedLost).map((leadId) => ({
      campaign_id: selectedCampaignId,
      crm_lead_id: leadId,
      status: "queued",
      stage: "abertura",
      temperature: 15,
    }));
    const { error } = await supabase.from("pulse_outbound_leads" as any).insert(rows as any);
    if (error) {
      toast.error("Erro ao adicionar leads: " + error.message);
      return;
    }
    toast.success(`${rows.length} lead(s) adicionados ao Pulse`);
    setSelectedLost(new Set());
    refreshPulseLeads();
  };

  // Generate AI message
  const generateAI = async (pulse: PulseLead) => {
    if (!activeCampaign) return;
    setAiLoadingId(pulse.id);
    try {
      const { data, error } = await supabase.functions.invoke("accord-pulse-agent", {
        body: {
          campaign: activeCampaign,
          lead: pulse.crm_leads,
          pulseLead: pulse,
        },
      });
      if (error || !data?.message) throw error || new Error("sem resposta");
      setDraftMessages((prev) => ({ ...prev, [pulse.id]: data.message }));
      await supabase
        .from("pulse_outbound_leads" as any)
        .update({ next_message: data.message } as any)
        .eq("id", pulse.id);
      toast.success("Mensagem sugerida pela IA");
    } catch (e: any) {
      toast.error("Erro IA: " + (e?.message || "tente novamente"));
    } finally {
      setAiLoadingId(null);
    }
  };

  // Send message
  const sendMessage = async (pulse: PulseLead) => {
    if (!companyId || !activeCampaign) return;
    const text = (draftMessages[pulse.id] ?? pulse.next_message ?? "").trim();
    if (!text) {
      toast.error("Escreva ou gere uma mensagem antes de enviar");
      return;
    }
    const lead = pulse.crm_leads;
    const phone = normalizePhone(lead?.phone);
    if (!phone) {
      toast.error("Lead sem telefone válido");
      return;
    }
    setSendingId(pulse.id);
    try {
      // Ensure whatsapp_contact
      let contactId = pulse.whatsapp_contact_id;
      if (!contactId) {
        const { data: existing } = await supabase
          .from("whatsapp_contacts")
          .select("id")
          .eq("company_id", companyId)
          .eq("phone", phone)
          .maybeSingle();
        if (existing?.id) {
          contactId = existing.id;
        } else {
          const { data: created, error: createErr } = await supabase
            .from("whatsapp_contacts")
            .insert({
              company_id: companyId,
              name: lead?.contact_name || lead?.company_name || "Lead Pulse",
              phone,
              lead_id: lead?.id ?? null,
              labels: ["pulse", "outbound"],
              conversation_status: "fila",
            } as any)
            .select()
            .single();
          if (createErr) throw createErr;
          contactId = created.id;
        }
        await supabase
          .from("pulse_outbound_leads" as any)
          .update({ whatsapp_contact_id: contactId } as any)
          .eq("id", pulse.id);
      }

      // Create message row
      const { data: msg, error: msgErr } = await supabase
        .from("whatsapp_messages")
        .insert({
          company_id: companyId,
          contact_id: contactId,
          phone,
          message: text,
          direction: "outbound",
          status: "sending",
          message_type: "text",
          metadata: {
            source: "accord_pulse",
            pulse_lead_id: pulse.id,
            campaign_id: activeCampaign.id,
          },
        } as any)
        .select()
        .single();
      if (msgErr) throw msgErr;

      // Invoke whatsapp-send
      const { data: sendData, error: sendErr } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          tenant_id: companyId,
          phone,
          text,
          message_id: msg.id,
          message_type: "text",
        },
      });
      if (sendErr || !sendData?.success) {
        await supabase.from("whatsapp_messages").update({ status: "failed" } as any).eq("id", msg.id);
        throw new Error(sendData?.message || sendErr?.message || "Falha no envio");
      }

      // Update pulse lead
      const stageOrder = ["abertura", "dor", "prova", "objecao", "agenda"];
      const idx = stageOrder.indexOf(pulse.stage);
      const nextStage = stageOrder[Math.min(idx + 1, stageOrder.length - 1)];
      const newTemp = Math.min(100, (pulse.temperature || 0) + 12);
      const nextActionAt = new Date(Date.now() + (activeCampaign.human_delay_minutes || 180) * 60000).toISOString();

      await supabase
        .from("pulse_outbound_leads" as any)
        .update({
          status: "warming",
          stage: nextStage,
          attempts: (pulse.attempts || 0) + 1,
          temperature: newTemp,
          next_message: null,
          last_sent_at: new Date().toISOString(),
          next_action_at: nextActionAt,
        } as any)
        .eq("id", pulse.id);

      setDraftMessages((prev) => {
        const cp = { ...prev };
        delete cp[pulse.id];
        return cp;
      });
      toast.success("Mensagem enviada");
      refreshPulseLeads();
    } catch (e: any) {
      toast.error("Erro ao enviar: " + (e?.message || ""));
    } finally {
      setSendingId(null);
    }
  };

  const togglePause = async (pulse: PulseLead) => {
    const newStatus = pulse.status === "paused" ? "warming" : "paused";
    await supabase.from("pulse_outbound_leads" as any).update({ status: newStatus } as any).eq("id", pulse.id);
    refreshPulseLeads();
  };

  const markMeeting = async (pulse: PulseLead) => {
    await supabase
      .from("pulse_outbound_leads" as any)
      .update({ status: "meeting", meeting_at: new Date().toISOString() } as any)
      .eq("id", pulse.id);
    toast.success("Reunião marcada — lead sai do aquecimento");
    refreshPulseLeads();
  };

  if (!allowed) return null;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-orange-500/15 text-orange-500 shrink-0">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accord Pulse</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Aquecimento inteligente de leads descartados com WhatsApp, IA e controle humano.
            </p>
          </div>
        </div>
        {activeCampaign && (
          <Badge variant="secondary" className="text-xs">
            Campanha ativa: <span className="ml-1 font-semibold">{activeCampaign.name}</span>
          </Badge>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Leads no Pulse" value={metrics.total} icon={Users} />
        <MetricCard label="Em aquecimento" value={metrics.warming} icon={Flame} accent="orange" />
        <MetricCard label="Reuniões marcadas" value={metrics.meeting} icon={CalendarCheck2} accent="emerald" />
        <MetricCard label="Temperatura média" value={`${metrics.avgTemp}°`} icon={Thermometer} accent="rose" />
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Fila outbound</TabsTrigger>
          <TabsTrigger value="lost">Leads descartados</TabsTrigger>
          <TabsTrigger value="campaign">Campanha</TabsTrigger>
        </TabsList>

        {/* QUEUE TAB */}
        <TabsContent value="queue" className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-muted-foreground">Campanha:</Label>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="h-9 w-[280px]">
                <SelectValue placeholder="Selecione uma campanha" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!pulseLeads.length ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum lead em aquecimento. Vá em "Leads descartados" para começar.
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {pulseLeads.map((p) => {
                const lead = p.crm_leads || {};
                const draft = draftMessages[p.id] ?? p.next_message ?? "";
                return (
                  <Card key={p.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold truncate">{lead.company_name || "—"}</span>
                            <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[p.status] || p.status}</Badge>
                            <Badge variant="secondary" className="text-[10px]">Etapa: {STAGE_LABEL[p.stage] || p.stage}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {lead.contact_name || "Sem contato"} • {lead.phone || "sem telefone"}
                          </div>
                        </div>
                        <div className="w-full sm:w-48">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Temperatura</span>
                            <span className="font-mono">{p.temperature}°</span>
                          </div>
                          <Progress value={p.temperature} className="h-2" />
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Tentativas: {p.attempts} • Último envio: {p.last_sent_at ? new Date(p.last_sent_at).toLocaleString("pt-BR") : "—"}
                          </div>
                        </div>
                      </div>

                      <Textarea
                        rows={3}
                        placeholder="Próxima mensagem (gere com IA ou escreva manualmente)..."
                        value={draft}
                        onChange={(e) => setDraftMessages((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      />

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateAI(p)}
                          disabled={aiLoadingId === p.id}
                        >
                          {aiLoadingId === p.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                          IA
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => sendMessage(p)}
                          disabled={sendingId === p.id || p.status === "meeting"}
                        >
                          {sendingId === p.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                          Enviar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => togglePause(p)}>
                          {p.status === "paused" ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                          {p.status === "paused" ? "Retomar" : "Pausar"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => markMeeting(p)} className="text-emerald-600">
                          <CalendarCheck2 className="h-4 w-4 mr-1" />
                          Marcar reunião
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* LOST TAB */}
        <TabsContent value="lost" className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-muted-foreground">
              {lostLeads.length} lead(s) descartado(s) • {selectedLost.size} selecionado(s)
            </div>
            <Button onClick={addToPulse} disabled={!selectedLost.size || !selectedCampaignId} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Adicionar ao Pulse
            </Button>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 w-10"></th>
                    <th className="p-2 text-left">Empresa</th>
                    <th className="p-2 text-left">Contato</th>
                    <th className="p-2 text-left">Telefone</th>
                    <th className="p-2 text-left">Motivo</th>
                    <th className="p-2 text-left">Descartado em</th>
                  </tr>
                </thead>
                <tbody>
                  {lostLeads.map((l) => (
                    <tr key={l.id} className="border-t border-border/40 hover:bg-muted/30">
                      <td className="p-2">
                        <Checkbox
                          checked={selectedLost.has(l.id)}
                          onCheckedChange={(c) => {
                            setSelectedLost((prev) => {
                              const next = new Set(prev);
                              if (c) next.add(l.id); else next.delete(l.id);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="p-2 font-medium">{l.company_name}</td>
                      <td className="p-2">{l.contact_name || "—"}</td>
                      <td className="p-2">{l.phone || "—"}</td>
                      <td className="p-2 text-muted-foreground">{l.lost_reason || "—"}</td>
                      <td className="p-2 text-xs">{new Date(l.updated_at).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                  {!lostLeads.length && (
                    <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Nenhum lead descartado encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAMPAIGN TAB */}
        <TabsContent value="campaign" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Nova campanha</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Reativação Q2" />
                </div>
                <div>
                  <Label>Objetivo</Label>
                  <Input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Ex: Reaquecer leads que perderam orçamento" />
                </div>
                <div>
                  <Label>Oferta</Label>
                  <Textarea rows={2} value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder="Ex: Plano com mais 3 meses gratuitos para retornar" />
                </div>
                <div>
                  <Label>Tom da conversa</Label>
                  <Input value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} />
                </div>
                <Button onClick={createCampaign} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Criar campanha
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Guardrails do Pulse</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <Bullet>A IA gera sugestões — o operador aprova e envia.</Bullet>
                <Bullet>A abordagem deve parecer humana, nada de disparo em massa.</Bullet>
                <Bullet>Objeções alimentam a próxima mensagem da sequência.</Bullet>
                <Bullet>Ao marcar reunião, o lead sai do fluxo de aquecimento.</Bullet>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Campanhas existentes</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Nome</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Objetivo</th>
                    <th className="p-2 text-left">Delay</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className={`border-t border-border/40 cursor-pointer hover:bg-muted/30 ${selectedCampaignId === c.id ? "bg-muted/40" : ""}`} onClick={() => setSelectedCampaignId(c.id)}>
                      <td className="p-2 font-medium">{c.name}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{c.status}</Badge></td>
                      <td className="p-2 text-muted-foreground truncate max-w-[260px]">{c.objective || "—"}</td>
                      <td className="p-2 text-xs">{c.human_delay_minutes} min</td>
                    </tr>
                  ))}
                  {!campaigns.length && (
                    <tr><td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">Nenhuma campanha ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  label, value, icon: Icon, accent = "primary",
}: { label: string; value: number | string; icon: any; accent?: "primary" | "orange" | "emerald" | "rose" }) {
  const colors: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    orange: "bg-orange-500/15 text-orange-500",
    emerald: "bg-emerald-500/15 text-emerald-500",
    rose: "bg-rose-500/15 text-rose-500",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colors[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold leading-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
