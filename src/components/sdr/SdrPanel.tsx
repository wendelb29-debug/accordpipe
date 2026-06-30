// SDR Operating System — porta o painel do projeto rapport-master-tool
// adaptado pro Accord: persistência Supabase (sdr_leads) e IA via edge function sdr-ai.
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, UserPlus, ClipboardCheck, Brain, MessageSquare, Lightbulb,
  ShieldAlert, Handshake, Send, Loader2, Sparkles, Trash2, Copy, Check, ArrowRightCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import {
  type Lead, type DiscKey, type LeadStage, type LeadOrigin,
  fetchLeads, createLead, updateLead, deleteLead, promoteLead, classifyTemperature,
} from "@/lib/sdr/sdr-storage";
import {
  bantQuestions, champQuestions, gpctQuestions, spinQuestions,
  discProfiles, objectionTemplates, closingTemplates,
} from "@/lib/sdr/sdr-data";

type SectionKey =
  | "dashboard" | "lead" | "qual" | "disc" | "copiloto"
  | "percepcao" | "objecoes" | "fechamento" | "cold";

const SECTIONS: { key: SectionKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "lead", label: "Entrada de Lead", icon: UserPlus },
  { key: "qual", label: "Qualificação", icon: ClipboardCheck },
  { key: "disc", label: "DISC", icon: Brain },
  { key: "copiloto", label: "Copiloto", icon: MessageSquare },
  { key: "percepcao", label: "Percepção", icon: Lightbulb },
  { key: "objecoes", label: "Objeções", icon: ShieldAlert },
  { key: "fechamento", label: "Fechamento", icon: Handshake },
  { key: "cold", label: "Cold Outreach", icon: Send },
];

async function callAi(body: unknown): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("sdr-ai", { body });
  if (error) {
    const msg = (error as any)?.message || "Erro na IA";
    if (/429/.test(msg)) throw new Error("Limite de requisições atingido — aguarde um instante.");
    if (/402/.test(msg)) throw new Error("Créditos de IA esgotados. Atualize o plano pra continuar.");
    throw new Error(msg);
  }
  return (data ?? {}) as Record<string, unknown>;
}

type SdrWs = { id: string; name: string; color: string | null };

export function SdrPanel({ workspaceId: workspaceIdProp }: { workspaceId?: string } = {}) {
  const { profile } = useAuth();
  const companyId = useActiveCompanyId();
  const { workspaces } = useWorkspaces();
  const [section, setSection] = useState<SectionKey>("dashboard");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // SDR workspaces (tipo = 'sdr')
  const [sdrWorkspaces, setSdrWorkspaces] = useState<SdrWs[]>([]);
  const [currentWsId, setCurrentWsId] = useState<string | null>(workspaceIdProp ?? null);

  // Promote modal
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteLeadId, setPromoteLeadId] = useState<string | null>(null);
  const [promoteTargetWs, setPromoteTargetWs] = useState<string>("");

  // Carrega workspaces tipo SDR do tenant ativo (se não veio fixado via prop)
  useEffect(() => {
    if (workspaceIdProp) { setCurrentWsId(workspaceIdProp); return; }
    if (!companyId) return;
    (async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id,name,color,workspace_type")
        .eq("servidor_id", companyId)
        .eq("workspace_type", "sdr")
        .order("name");
      if (error) { console.error(error); return; }
      const list = (data ?? []) as SdrWs[];
      setSdrWorkspaces(list);
      setCurrentWsId((prev) => prev ?? list[0]?.id ?? null);
    })();
  }, [companyId, workspaceIdProp]);

  // Re-carrega leads sempre que o workspace ativo mudar
  useEffect(() => {
    (async () => {
      setLoading(true);
      const l = currentWsId ? await fetchLeads({ workspaceId: currentWsId }) : [];
      setLeads(l);
      setActiveId(l[0]?.id ?? null);
      setLoading(false);
    })();
  }, [currentWsId]);

  const active = useMemo(() => leads.find((l) => l.id === activeId) ?? null, [leads, activeId]);

  const refresh = async () => {
    const l = currentWsId ? await fetchLeads({ workspaceId: currentWsId }) : [];
    setLeads(l);
  };

  const updateActive = async (patch: Partial<Lead>) => {
    if (!active) return;
    setLeads((prev) => prev.map((l) => (l.id === active.id ? { ...l, ...patch } : l)));
    await updateLead(active.id, patch);
  };

  const createNew = async (data: Partial<Lead>) => {
    if (!companyId) { toast.error("Selecione um tenant ativo"); return; }
    if (!currentWsId) { toast.error("Crie ou selecione um workspace do tipo SDR primeiro"); return; }
    const lead = await createLead({
      name: data.name ?? "",
      company: data.company,
      origin: data.origin,
      channel: data.channel,
      workspaceId: currentWsId,
      servidorId: companyId,
      ownerId: profile?.user_id ?? null,
    });
    if (!lead) return;
    setLeads((prev) => [lead, ...prev]);
    setActiveId(lead.id);
    setSection("qual");
  };

  const removeLead = async (id: string) => {
    await deleteLead(id);
    const next = leads.filter((l) => l.id !== id);
    setLeads(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  const openPromote = (id: string) => {
    setPromoteLeadId(id);
    setPromoteTargetWs("");
    setPromoteOpen(true);
  };
  const doPromote = async () => {
    if (!promoteLeadId || !promoteTargetWs) return;
    const { error } = await promoteLead(promoteLeadId, promoteTargetWs);
    if (error) { toast.error(`Erro ao promover: ${error}`); return; }
    toast.success("Lead promovido pro CRM!");
    setPromoteOpen(false);
    await refresh();
  };

  // Sem workspace SDR cadastrado → empty state
  if (!workspaceIdProp && sdrWorkspaces.length === 0 && !loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center">
        <p className="text-sm text-muted-foreground mb-2">Nenhum workspace do tipo <strong>SDR</strong> encontrado.</p>
        <p className="text-xs text-muted-foreground">Crie um workspace e selecione o tipo "SDR" pra começar a qualificar leads aqui.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }


  return (
    <div className="min-h-[60vh]">
      {/* Topo: lead ativo */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">SDR Operating System</div>
            <div className="text-sm font-bold">Copiloto de vendas consultivas</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!workspaceIdProp && sdrWorkspaces.length > 0 && (
            <Select value={currentWsId ?? ""} onValueChange={setCurrentWsId}>
              <SelectTrigger className="h-9 min-w-[200px]">
                <SelectValue placeholder="Workspace SDR" />
              </SelectTrigger>
              <SelectContent>
                {sdrWorkspaces.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ActiveLeadPill active={active} leads={leads} onChange={setActiveId} />
        </div>
      </div>


      <div className="grid md:grid-cols-[220px_1fr] gap-4">
        {/* Nav */}
        <nav className="md:sticky md:top-4 md:self-start bg-card border border-border rounded-2xl p-2 grid grid-cols-3 md:grid-cols-1 gap-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition",
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <main className="space-y-4">
          {section === "dashboard" && (
            <Dashboard leads={leads} onOpen={(id) => { setActiveId(id); setSection("qual"); }} onDelete={removeLead} onPromote={openPromote} />
          )}
          {section === "lead" && <NewLeadForm onCreate={createNew} />}
          {section === "qual" && (active ? <Qualificacao lead={active} onChange={updateActive} /> : <EmptyActive onGo={() => setSection("lead")} />)}
          {section === "disc" && (active ? <DiscPanel lead={active} onChange={updateActive} /> : <EmptyActive onGo={() => setSection("lead")} />)}
          {section === "copiloto" && (active ? <Copiloto lead={active} onChange={updateActive} /> : <EmptyActive onGo={() => setSection("lead")} />)}
          {section === "percepcao" && (active ? <Percepcao lead={active} /> : <EmptyActive onGo={() => setSection("lead")} />)}
          {section === "objecoes" && <Objecoes lead={active} />}
          {section === "fechamento" && <Fechamento lead={active} />}
          {section === "cold" && <ColdOutreach />}
        </main>
      </div>

      {/* Promote dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar pro Closer (CRM)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esse lead será copiado pro funil do CRM no workspace escolhido, na primeira coluna do Kanban. O lead aqui será marcado como <strong>qualificado</strong>.
          </p>
          <div className="mt-3">
            <Label>Workspace destino</Label>
            <Select value={promoteTargetWs} onValueChange={setPromoteTargetWs}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Escolha um workspace" /></SelectTrigger>
              <SelectContent>
                {workspaces.filter(w => w.type !== "pre_venda_sdr").map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteOpen(false)}>Cancelar</Button>
            <Button onClick={doPromote} disabled={!promoteTargetWs}>
              <ArrowRightCircle className="h-4 w-4 mr-1" /> Promover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===== shared ===== */

function EmptyActive({ onGo }: { onGo: () => void }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 text-center">
      <p className="text-muted-foreground mb-3">Nenhum lead ativo.</p>
      <Button onClick={onGo}>Criar novo lead</Button>
    </div>
  );
}

function ActiveLeadPill({ active, leads, onChange }: { active: Lead | null; leads: Lead[]; onChange: (id: string) => void }) {
  if (leads.length === 0) return <span className="text-xs text-muted-foreground">Nenhum lead</span>;
  return (
    <div className="flex items-center gap-2">
      <Select value={active?.id ?? ""} onValueChange={onChange}>
        <SelectTrigger className="h-9 min-w-[200px]"><SelectValue placeholder="Selecionar lead" /></SelectTrigger>
        <SelectContent>
          {leads.map((l) => (
            <SelectItem key={l.id} value={l.id}>{l.name || "(sem nome)"}{l.company ? ` — ${l.company}` : ""}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active && <Badge variant="outline">{active.stage}</Badge>}
    </div>
  );
}

function H1({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-black text-foreground">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-card border border-border rounded-2xl p-5", className)}>{children}</div>;
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); } catch { /* noop */ } setDone(true); setTimeout(() => setDone(false), 900); }}
      className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background hover:bg-muted"
      aria-label="Copiar"
    >
      {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

/* ===== 1. Dashboard ===== */
function Dashboard({ leads, onOpen, onDelete, onPromote }: { leads: Lead[]; onOpen: (id: string) => void; onDelete: (id: string) => void; onPromote: (id: string) => void }) {
  const ativos = leads.filter((l) => l.stage !== "ganho" && l.stage !== "perdido" && l.stage !== "qualificado").length;
  const qualif = leads.filter((l) => l.stage === "qualificacao").length;
  const fech = leads.filter((l) => l.stage === "fechamento").length;
  const ganhos = leads.filter((l) => l.stage === "ganho" || l.stage === "qualificado").length;
  const conv = leads.length ? Math.round((ganhos / leads.length) * 100) : 0;

  return (
    <>
      <H1 title="Dashboard SDR" sub="Visão rápida do seu funil." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Ativos" value={ativos} />
        <Stat label="Qualificação" value={qualif} />
        <Stat label="Fechamento" value={fech} />
        <Stat label="Conversão" value={`${conv}%`} />
      </div>
      <Card>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Leads</div>
        {leads.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lead ainda. Vá em Entrada de Lead.</p>}
        <div className="divide-y divide-border">
          {leads.map((l) => (
            <div key={l.id} className="py-3 flex items-center justify-between gap-3">
              <button onClick={() => onOpen(l.id)} className="text-left flex-1 min-w-0">
                <div className="font-bold text-foreground truncate">{l.name || "(sem nome)"} <span className="text-muted-foreground font-normal">— {l.company}</span></div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="capitalize">{l.origin}</span><span>•</span><span className="capitalize">{l.stage}</span>
                  {l.disc && <><span>•</span><Badge className="text-[10px] py-0" style={{ backgroundColor: discProfiles[l.disc].color }}>{l.disc}</Badge></>}
                  {l.temp && <><span>•</span><span className="capitalize">{l.temp}</span></>}
                </div>
              </button>
              <button onClick={() => onPromote(l.id)} className="text-xs px-2 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/10" title="Enviar pro Closer (CRM)">
                <ArrowRightCircle className="h-4 w-4 inline mr-1" />Enviar pro CRM
              </button>
              <button onClick={() => onDelete(l.id)} className="text-muted-foreground hover:text-destructive p-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-2xl font-black text-foreground mt-1">{value}</div>
    </Card>
  );
}

/* ===== 2. New Lead ===== */
function NewLeadForm({ onCreate }: { onCreate: (data: Partial<Lead>) => void }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [origin, setOrigin] = useState<LeadOrigin>("cold-call");
  const [channel, setChannel] = useState("");
  const submit = () => {
    if (!name.trim()) { toast.error("Informe o nome do lead"); return; }
    onCreate({ name, company, origin, channel, stage: "novo" });
    toast.success("Lead criado");
  };
  return (
    <>
      <H1 title="Entrada de Lead" sub="Crie o lead e inicie a conversa SDR." />
      <Card className="space-y-4">
        <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva" className="mt-1" /></div>
        <div><Label>Empresa</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex: Acme Ltda" className="mt-1" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Origem</Label>
            <Select value={origin} onValueChange={(v) => setOrigin(v as LeadOrigin)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cold-call">Cold Call</SelectItem>
                <SelectItem value="cold-email">Cold Email</SelectItem>
                <SelectItem value="social">Social Selling</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Canal de contato</Label><Input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="WhatsApp, Linkedin, etc." className="mt-1" /></div>
        </div>
        <Button onClick={submit} className="w-full h-11">Iniciar Conversa SDR</Button>
      </Card>
    </>
  );
}

/* ===== 3. Qualificação ===== */
function Qualificacao({ lead, onChange }: { lead: Lead; onChange: (p: Partial<Lead>) => void }) {
  const set = (framework: "bant" | "champ" | "gpct" | "spin", key: string, val: string) => {
    const next = { ...lead.qual, [framework]: { ...((lead.qual as any)[framework] ?? {}), [key]: val } };
    const updated = { ...lead, qual: next };
    const temp = classifyTemperature(updated);
    onChange({ qual: next, temp, stage: lead.stage === "novo" ? "qualificacao" : lead.stage });
  };
  return (
    <>
      <H1 title="Qualificação" sub={`${lead.name} — ${lead.company || "—"}`} />
      <div className="flex items-center gap-3 mb-4">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Etapa</Label>
        <Select value={lead.stage} onValueChange={(v) => onChange({ stage: v as LeadStage })}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="qualificacao">Qualificação</SelectItem>
            <SelectItem value="fechamento">Fechamento</SelectItem>
            <SelectItem value="ganho">Ganho</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
            <SelectItem value="qualificado">Qualificado (no CRM)</SelectItem>
          </SelectContent>
        </Select>
        {lead.temp && (
          <Badge className={cn("capitalize", lead.temp === "quente" ? "bg-rose-600" : lead.temp === "morno" ? "bg-amber-500" : "bg-muted text-foreground")}>
            Lead {lead.temp}
          </Badge>
        )}
      </div>
      <Tabs defaultValue="bant">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="bant">BANT</TabsTrigger>
          <TabsTrigger value="champ">CHAMP</TabsTrigger>
          <TabsTrigger value="gpct">GPCT</TabsTrigger>
          <TabsTrigger value="spin">SPIN</TabsTrigger>
        </TabsList>
        {(["bant","champ","gpct","spin"] as const).map((fw) => {
          const map = { bant: bantQuestions, champ: champQuestions, gpct: gpctQuestions, spin: spinQuestions }[fw];
          return (
            <TabsContent key={fw} value={fw} className="mt-4 space-y-3">
              {Object.entries(map).map(([k, q]) => (
                <QualField key={k} label={k.toUpperCase()} question={q as string}
                  value={((lead.qual as any)[fw] as Record<string, string> | undefined)?.[k] ?? ""}
                  onChange={(v) => set(fw, k, v)} />
              ))}
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
}
function QualField({ label, question, value, onChange }: { label: string; question: string; value: string; onChange: (v: string) => void }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono">{label}</Badge>
        <CopyBtn text={question} />
      </div>
      <div className="text-sm font-semibold text-foreground">{question}</div>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Anote a resposta do cliente..." className="min-h-[60px]" />
    </Card>
  );
}

/* ===== 4. DISC ===== */
function DiscPanel({ lead, onChange }: { lead: Lead; onChange: (p: Partial<Lead>) => void }) {
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<{ perfil: DiscKey; confianca: string; sinais: string[]; tom_ideal: string; evitar: string } | null>(null);
  const readWithAi = async () => {
    setLoading(true);
    try {
      const res = await callAi({ task: "disc-read", context: { lead: { name: lead.name, company: lead.company, qual: lead.qual } }, history: lead.conversation.slice(-20) });
      setReading(res as never);
      if ((res as any).perfil) onChange({ disc: (res as any).perfil as DiscKey });
    } catch (e: any) { toast.error(e?.message ?? "Erro ao consultar IA"); }
    finally { setLoading(false); }
  };
  const current = lead.disc;
  return (
    <>
      <H1 title="Leitura DISC" sub="Defina manualmente ou peça a IA inferir pelo histórico." />
      <Card className="mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Label>Perfil do lead:</Label>
          <Select value={current ?? ""} onValueChange={(v) => onChange({ disc: v as DiscKey })}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="D">D — Dominante</SelectItem>
              <SelectItem value="I">I — Influente</SelectItem>
              <SelectItem value="S">S — Estável</SelectItem>
              <SelectItem value="C">C — Analítico</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={readWithAi} disabled={loading} variant="outline">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Ler com IA
          </Button>
        </div>
        {reading && (
          <div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm space-y-1">
            <div><span className="font-bold">Perfil:</span> {reading.perfil} (confiança {reading.confianca})</div>
            <div><span className="font-bold">Sinais:</span> {reading.sinais?.join(", ")}</div>
            <div><span className="font-bold">Tom ideal:</span> {reading.tom_ideal}</div>
            <div><span className="font-bold">Evitar:</span> {reading.evitar}</div>
          </div>
        )}
      </Card>
      <div className="grid md:grid-cols-2 gap-3">
        {(Object.keys(discProfiles) as DiscKey[]).map((k) => {
          const p = discProfiles[k];
          const active = current === k;
          return (
            <div key={k} className={cn("rounded-2xl border-2 p-4 transition cursor-pointer", active ? "border-primary bg-card" : "border-border bg-card hover:border-primary/40")} onClick={() => onChange({ disc: k })}>
              <div className="flex items-center gap-2 mb-2">
                <span className="grid place-items-center h-8 w-8 rounded-lg text-white font-black text-sm" style={{ backgroundColor: p.color }}>{k}</span>
                <div className="font-bold text-foreground">{p.name}</div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{p.short}</p>
              <div className="text-xs space-y-1">
                <div><span className="font-bold text-emerald-600">Como falar:</span> {p.how}</div>
                <div><span className="font-bold text-rose-600">Como não falar:</span> {p.never}</div>
                <div><span className="font-bold">Tom:</span> {p.tom}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ===== 5. Copiloto ===== */
function Copiloto({ lead, onChange }: { lead: Lead; onChange: (p: Partial<Lead>) => void }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{ suggested: string; alternatives: string[]; urgency: string; intent: string; reasoning: string } | null>(null);

  const send = async () => {
    if (!input.trim()) return;
    const msg = { id: crypto.randomUUID(), role: "client" as const, content: input.trim(), ts: Date.now() };
    const conv = [...lead.conversation, msg];
    onChange({ conversation: conv });
    setInput("");
    setLoading(true);
    try {
      const res = await callAi({
        task: "copilot",
        context: { lead: { name: lead.name, company: lead.company, disc: lead.disc, qual: lead.qual, stage: lead.stage } },
        message: msg.content,
        history: conv.slice(-10).map((m) => ({ role: m.role === "client" ? "user" : "assistant", content: m.content })),
      });
      setSuggestion(res as never);
    } catch (e: any) { toast.error(e?.message ?? "Erro na IA"); }
    finally { setLoading(false); }
  };

  const useSuggested = (text: string) => {
    const msg = { id: crypto.randomUUID(), role: "sdr" as const, content: text, ts: Date.now() };
    onChange({ conversation: [...lead.conversation, msg] });
    setSuggestion(null);
    navigator.clipboard?.writeText(text).catch(() => {});
    toast.success("Resposta usada e copiada");
  };

  return (
    <>
      <H1 title="Copiloto SDR" sub={`Conversa com ${lead.name}${lead.disc ? ` (DISC ${lead.disc})` : ""}`} />
      <Card className="mb-3 max-h-[400px] overflow-y-auto space-y-2">
        {lead.conversation.length === 0 && <p className="text-sm text-muted-foreground">Cole abaixo a mensagem do cliente e a IA sugere a resposta.</p>}
        {lead.conversation.map((m) => (
          <div key={m.id} className={cn("rounded-xl px-3 py-2 text-sm max-w-[85%]", m.role === "client" || m.role === "user" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground ml-auto")}>
            <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">{m.role === "client" || m.role === "user" ? "Cliente" : "SDR"}</div>
            {m.content}
          </div>
        ))}
      </Card>
      <Card className="space-y-2 mb-3">
        <Label>Mensagem do cliente</Label>
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Cole aqui o que o cliente disse..." className="min-h-[80px]" />
        <Button onClick={send} disabled={loading || !input.trim()} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Sugerir resposta
        </Button>
      </Card>
      {suggestion && (
        <Card className="border-primary border-2 space-y-3">
          <div className="flex items-center gap-2">
            <Badge>{suggestion.intent}</Badge>
            <Badge className={cn(suggestion.urgency === "alto" ? "bg-rose-600" : suggestion.urgency === "medio" ? "bg-amber-500" : "bg-emerald-600")}>Urgência {suggestion.urgency}</Badge>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Resposta sugerida</div>
            <div className="flex gap-2">
              <div className="flex-1 bg-muted/60 rounded-xl p-3 text-sm">{suggestion.suggested}</div>
              <CopyBtn text={suggestion.suggested} />
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => useSuggested(suggestion.suggested)}>Usar essa</Button>
          </div>
          {suggestion.alternatives?.map((alt, i) => (
            <div key={i}>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Alternativa {i + 1}</div>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted/60 rounded-xl p-3 text-sm">{alt}</div>
                <CopyBtn text={alt} />
              </div>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => useSuggested(alt)}>Usar essa</Button>
            </div>
          ))}
          {suggestion.reasoning && <p className="text-xs text-muted-foreground italic">Por quê: {suggestion.reasoning}</p>}
        </Card>
      )}
    </>
  );
}

/* ===== 6. Percepção ===== */
function Percepcao({ lead }: { lead: Lead }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ dor: string; impacto: string; risco: string; urgencia: string; frase_pronta: string } | null>(null);
  const run = async () => {
    setLoading(true);
    try { setData(await callAi({ task: "perception", context: { lead: { name: lead.name, company: lead.company, disc: lead.disc, qual: lead.qual } } }) as never); }
    catch (e: any) { toast.error(e?.message ?? "Erro na IA"); }
    finally { setLoading(false); }
  };
  return (
    <>
      <H1 title="Geração de Percepção" sub="A IA aponta dor, impacto, risco e urgência adaptados ao DISC." />
      <Card className="mb-3"><Button onClick={run} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Gerar percepção</Button></Card>
      {data && (
        <div className="grid md:grid-cols-2 gap-3">
          <PercepCard title="Dor principal" text={data.dor} />
          <PercepCard title="Impacto" text={data.impacto} />
          <PercepCard title="Risco" text={data.risco} />
          <PercepCard title="Urgência" text={data.urgencia} />
          <Card className="md:col-span-2 bg-foreground text-background border-foreground">
            <div className="text-xs uppercase tracking-wider opacity-60 mb-2">Frase pronta pra usar</div>
            <div className="flex gap-2 items-start"><p className="flex-1 text-sm">{data.frase_pronta}</p><CopyBtn text={data.frase_pronta} /></div>
          </Card>
        </div>
      )}
    </>
  );
}
function PercepCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}

/* ===== 7. Objeções ===== */
function Objecoes({ lead }: { lead: Lead | null }) {
  const disc = lead?.disc;
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiRes, setAiRes] = useState<{ curta: string; consultiva: string; direta: string; armadilha: string } | null>(null);
  const runCustom = async () => {
    if (!custom.trim()) return;
    setLoading(true);
    try { setAiRes(await callAi({ task: "objection", context: { lead: { name: lead?.name, company: lead?.company, disc, qual: lead?.qual } }, message: custom.trim() }) as never); }
    catch (e: any) { toast.error(e?.message ?? "Erro na IA"); }
    finally { setLoading(false); }
  };
  return (
    <>
      <H1 title="Objeções" sub={disc ? `Adaptado ao perfil ${disc} — ${discProfiles[disc].name}` : "Defina o DISC do lead pra adaptar."} />
      <Card className="mb-4 space-y-2">
        <Label>Objeção específica do cliente</Label>
        <Textarea value={custom} onChange={(e) => setCustom(e.target.value)} placeholder='Ex: "Já trabalho com outro fornecedor"' className="min-h-[60px]" />
        <Button onClick={runCustom} disabled={loading || !custom.trim()}>{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Responder com IA</Button>
        {aiRes && (
          <div className="grid md:grid-cols-3 gap-2 mt-2">
            <ObjVariant title="Curta" text={aiRes.curta} />
            <ObjVariant title="Consultiva" text={aiRes.consultiva} />
            <ObjVariant title="Direta" text={aiRes.direta} />
            <div className="md:col-span-3 text-xs text-rose-700 italic bg-rose-50 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200 dark:border-rose-900 rounded-xl p-2"><strong>Não fale:</strong> {aiRes.armadilha}</div>
          </div>
        )}
      </Card>
      <Accordion type="multiple" className="space-y-2">
        {Object.entries(objectionTemplates).map(([obj, byDisc]) => (
          <AccordionItem key={obj} value={obj} className="bg-card border border-border rounded-2xl px-4">
            <AccordionTrigger className="text-sm font-bold">{obj}</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {(Object.keys(byDisc) as DiscKey[]).map((k) => (
                <div key={k} className={cn("rounded-xl p-3 border", disc === k ? "border-primary bg-primary/5" : "border-border")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="grid place-items-center h-6 w-6 rounded text-white text-xs font-bold" style={{ backgroundColor: discProfiles[k].color }}>{k}</span>
                    <span className="text-xs font-bold uppercase">{discProfiles[k].name}</span>
                    <CopyBtn text={byDisc[k]} />
                  </div>
                  <p className="text-sm text-foreground">{byDisc[k]}</p>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}
function ObjVariant({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
        <CopyBtn text={text} />
      </div>
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}

/* ===== 8. Fechamento ===== */
function Fechamento({ lead }: { lead: Lead | null }) {
  const disc = lead?.disc;
  const [loading, setLoading] = useState(false);
  const [aiRes, setAiRes] = useState<{ leve: string; consultivo: string; direto: string } | null>(null);
  const run = async () => {
    setLoading(true);
    try { setAiRes(await callAi({ task: "closing", context: { lead: { name: lead?.name, company: lead?.company, disc, qual: lead?.qual } } }) as never); }
    catch (e: any) { toast.error(e?.message ?? "Erro na IA"); }
    finally { setLoading(false); }
  };
  const fixed = disc ? closingTemplates[disc] : null;
  return (
    <>
      <H1 title="Fechamento SDR" sub={disc ? `Sugestões pro perfil ${disc}` : "Defina o DISC pra adaptar."} />
      {fixed && (
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <CloseCard title="Leve" text={fixed.leve} />
          <CloseCard title="Consultivo" text={fixed.consultivo} />
          <CloseCard title="Direto" text={fixed.direto} />
        </div>
      )}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personalizado pra este lead</div>
          <Button size="sm" onClick={run} disabled={loading} variant="outline">{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Gerar com IA</Button>
        </div>
        {aiRes && (
          <div className="grid md:grid-cols-3 gap-3">
            <CloseCard title="Leve" text={aiRes.leve} />
            <CloseCard title="Consultivo" text={aiRes.consultivo} />
            <CloseCard title="Direto" text={aiRes.direto} />
          </div>
        )}
      </Card>
    </>
  );
}
function CloseCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
        <CopyBtn text={text} />
      </div>
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}

/* ===== 9. Cold Outreach (Conversacional + Sequência 7d) ===== */
function ColdOutreach() {
  return (
    <>
      <H1 title="Cold Outreach" sub="Templates pra abrir conversa do zero." />
      <Tabs defaultValue="conversa">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="conversa">Conversacional (IA)</TabsTrigger>
          <TabsTrigger value="sequencia">Sequência 7d (IA)</TabsTrigger>
        </TabsList>
        <TabsContent value="conversa" className="mt-4"><ConversacionalOutreach /></TabsContent>
        <TabsContent value="sequencia" className="mt-4"><SequenciaOutreach /></TabsContent>
      </Tabs>
    </>
  );
}

type OutreachAlt = string | { tipo_abertura?: string; texto?: string };
type OutreachResult = { icp?: string; temperatura?: string; estilo?: string; nivel?: string; intencao?: string; raciocinio?: string; principal?: string; alternativas?: OutreachAlt[]; cta?: string; };

function ConversacionalOutreach() {
  const [canal, setCanal] = useState<"whatsapp" | "linkedin" | "email" | "ligacao">("whatsapp");
  const [nivel, setNivel] = useState<"auto" | "leve" | "medio" | "direto">("auto");
  const [estilo, setEstilo] = useState<"auto" | "direto" | "relacional" | "analitico" | "cetico">("auto");
  const [nome, setNome] = useState(""); const [cargo, setCargo] = useState(""); const [empresa, setEmpresa] = useState("");
  const [segmento, setSegmento] = useState(""); const [dor, setDor] = useState(""); const [contexto, setContexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<OutreachResult | null>(null);
  const [seed, setSeed] = useState(0);

  const run = async () => {
    if (!dor.trim() && !segmento.trim()) { toast.error("Informe pelo menos a dor ou o segmento"); return; }
    setLoading(true);
    try {
      setRes(await callAi({ task: "outreach", context: { canal, nivel_desejado: nivel, estilo_desejado: estilo, lead: { nome, cargo, empresa, segmento, dor, contexto }, variacao_seed: seed, instrucao_extra: "Não repita aberturas usadas antes. Não use 'espero que esteja bem'. Não soe template." } }) as OutreachResult);
    } catch (e: any) { toast.error(e?.message ?? "Erro ao gerar"); }
    finally { setLoading(false); }
  };
  const regen = () => { setSeed(s => s + 1); setTimeout(run, 0); };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Canal</Label>
            <Select value={canal} onValueChange={(v) => setCanal(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="email">Email</SelectItem><SelectItem value="ligacao">Abertura de ligação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Nível</Label>
            <Select value={nivel} onValueChange={(v) => setNivel(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem><SelectItem value="leve">Leve</SelectItem>
                <SelectItem value="medio">Médio</SelectItem><SelectItem value="direto">Direto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Estilo do ICP</Label>
            <Select value={estilo} onValueChange={(v) => setEstilo(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem><SelectItem value="direto">Direto (decisor)</SelectItem>
                <SelectItem value="relacional">Relacional</SelectItem><SelectItem value="analitico">Analítico</SelectItem>
                <SelectItem value="cetico">Cético</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} className="mt-1" /></div>
          <div><Label>Cargo</Label><Input value={cargo} onChange={e => setCargo(e.target.value)} className="mt-1" /></div>
          <div><Label>Empresa</Label><Input value={empresa} onChange={e => setEmpresa(e.target.value)} className="mt-1" /></div>
          <div className="md:col-span-2"><Label>Segmento</Label><Input value={segmento} onChange={e => setSegmento(e.target.value)} className="mt-1" /></div>
        </div>
        <div><Label>Dor / processo</Label><Textarea value={dor} onChange={e => setDor(e.target.value)} rows={2} className="mt-1" /></div>
        <div><Label>Contexto extra</Label><Textarea value={contexto} onChange={e => setContexto(e.target.value)} rows={2} className="mt-1" /></div>
        <div className="flex gap-2">
          <Button onClick={run} disabled={loading} className="flex-1 h-11">{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Gerar mensagem</Button>
          {res && <Button onClick={regen} disabled={loading} variant="outline" className="h-11">Regenerar</Button>}
        </div>
      </Card>

      {res && (
        <div className="space-y-3">
          <Card>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {res.icp && <Badge variant="outline" className="capitalize">ICP: {res.icp}</Badge>}
              {res.temperatura && <Badge variant="outline" className="capitalize">{res.temperatura}</Badge>}
              {res.estilo && <Badge variant="outline" className="capitalize">{res.estilo}</Badge>}
              {res.intencao && <Badge variant="outline" className="capitalize">{res.intencao.replace(/_/g," ")}</Badge>}
              {res.nivel && <Badge className={cn("capitalize", res.nivel === "direto" ? "bg-rose-600" : res.nivel === "medio" ? "bg-amber-500" : "bg-emerald-600")}>{res.nivel}</Badge>}
            </div>
            {res.raciocinio && <p className="text-xs text-muted-foreground mb-3 italic">{res.raciocinio}</p>}
            {res.principal && (
              <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Principal</span>
                  <CopyBtn text={res.principal} />
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{res.principal}</p>
              </div>
            )}
          </Card>
          {res.alternativas && res.alternativas.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              {res.alternativas.map((alt, i) => {
                const texto = typeof alt === "string" ? alt : (alt.texto ?? "");
                const tipo = typeof alt === "string" ? null : alt.tipo_abertura;
                return (
                  <div key={i} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Variação {i+1}{tipo ? ` — ${tipo}` : ""}</span>
                      <CopyBtn text={texto} />
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{texto}</p>
                  </div>
                );
              })}
            </div>
          )}
          {res.cta && (
            <Card className="p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">CTA usado</div>
              <div className="flex items-center justify-between gap-2"><p className="text-sm text-foreground">{res.cta}</p><CopyBtn text={res.cta} /></div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

type SequenceDay = { dia: number; foco?: string; objetivo?: string; tom?: string; pressao?: string; tipo_abertura?: string; principal?: string; variacoes?: string[]; };
type SequenceResult = { icp?: string; canal?: string; resumo_estrategia?: string; dias?: SequenceDay[]; };

function SequenciaOutreach() {
  const [canal, setCanal] = useState<"whatsapp" | "linkedin" | "email" | "ligacao">("whatsapp");
  const [estilo, setEstilo] = useState<"auto" | "direto" | "relacional" | "analitico" | "cetico">("auto");
  const [nome, setNome] = useState(""); const [cargo, setCargo] = useState(""); const [empresa, setEmpresa] = useState("");
  const [segmento, setSegmento] = useState(""); const [dor, setDor] = useState(""); const [contexto, setContexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<SequenceResult | null>(null);
  const [seed, setSeed] = useState(0);

  const run = async () => {
    if (!dor.trim() && !segmento.trim()) { toast.error("Informe pelo menos a dor ou o segmento"); return; }
    setLoading(true);
    try {
      setRes(await callAi({ task: "sequence", context: { canal, estilo_desejado: estilo, lead: { nome, cargo, empresa, segmento, dor, contexto }, variacao_seed: seed, instrucao_extra: "Cada dia precisa ter abertura diferente. Nada de soar follow-up automático." } }) as SequenceResult);
    } catch (e: any) { toast.error(e?.message ?? "Erro ao gerar sequência"); }
    finally { setLoading(false); }
  };
  const regen = () => { setSeed(s => s + 1); setTimeout(run, 0); };
  const allText = () => !res?.dias ? "" : res.dias.map(d => `DIA ${d.dia} — ${d.foco ?? ""}\n${d.principal ?? ""}`).join("\n\n---\n\n");

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Canal</Label>
            <Select value={canal} onValueChange={(v) => setCanal(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="email">Email</SelectItem><SelectItem value="ligacao">Ligação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Estilo do ICP</Label>
            <Select value={estilo} onValueChange={(v) => setEstilo(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem><SelectItem value="direto">Direto</SelectItem>
                <SelectItem value="relacional">Relacional</SelectItem><SelectItem value="analitico">Analítico</SelectItem>
                <SelectItem value="cetico">Cético</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} className="mt-1" /></div>
          <div><Label>Cargo</Label><Input value={cargo} onChange={e => setCargo(e.target.value)} className="mt-1" /></div>
          <div><Label>Empresa</Label><Input value={empresa} onChange={e => setEmpresa(e.target.value)} className="mt-1" /></div>
          <div><Label>Segmento</Label><Input value={segmento} onChange={e => setSegmento(e.target.value)} className="mt-1" /></div>
        </div>
        <div><Label>Dor / processo</Label><Textarea value={dor} onChange={e => setDor(e.target.value)} rows={2} className="mt-1" /></div>
        <div><Label>Contexto extra</Label><Textarea value={contexto} onChange={e => setContexto(e.target.value)} rows={2} className="mt-1" /></div>
        <div className="flex gap-2">
          <Button onClick={run} disabled={loading} className="flex-1 h-11">{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Gerar sequência de 7 dias</Button>
          {res && <Button onClick={regen} disabled={loading} variant="outline" className="h-11">Regenerar</Button>}
        </div>
      </Card>

      {res && (
        <div className="space-y-3">
          <Card>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {res.icp && <Badge variant="outline" className="capitalize">ICP: {res.icp}</Badge>}
              {res.canal && <Badge variant="outline" className="capitalize">{res.canal}</Badge>}
              <div className="ml-auto"><CopyBtn text={allText()} /></div>
            </div>
            {res.resumo_estrategia && <p className="text-xs text-muted-foreground italic">{res.resumo_estrategia}</p>}
          </Card>
          {res.dias?.map((d) => (
            <Card key={d.dia} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">{d.dia}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">Dia {d.dia}{d.foco ? ` — ${d.foco}` : ""}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {d.tipo_abertura && <Badge variant="outline" className="text-[10px] capitalize">{d.tipo_abertura}</Badge>}
                    {d.objetivo && <Badge variant="outline" className="text-[10px] capitalize">{d.objetivo}</Badge>}
                    {d.tom && <Badge variant="outline" className="text-[10px] capitalize">tom {d.tom}</Badge>}
                    {d.pressao && <Badge className={cn("text-[10px] capitalize", d.pressao === "alta" ? "bg-rose-600" : d.pressao === "media" ? "bg-amber-500" : "bg-emerald-600")}>pressão {d.pressao}</Badge>}
                  </div>
                </div>
              </div>
              {d.principal && (
                <div className="rounded-xl border-2 border-primary bg-primary/5 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Principal</span>
                    <CopyBtn text={d.principal} />
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{d.principal}</p>
                </div>
              )}
              {d.variacoes && d.variacoes.length > 0 && (
                <div className="grid md:grid-cols-2 gap-2">
                  {d.variacoes.map((v, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Variação {i+1}</span>
                        <CopyBtn text={v} />
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
