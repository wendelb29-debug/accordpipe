import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Send, MessageSquare, Mail, Search, Play, Pause, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MassCampaignWizard } from "@/components/marketing/mass/MassCampaignWizard";
import { CampaignDetailsDialog } from "@/components/marketing/mass/CampaignDetailsDialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MassCampaign {
  id: string;
  name: string;
  description: string | null;
  channel: "whatsapp" | "email";
  status: string;
  totals: any;
  scheduled_at: string | null;
  created_at: string;
}

interface MassTemplate {
  id: string;
  name: string;
  channel: "whatsapp" | "email";
  category: string | null;
  subject: string | null;
  body: string;
  is_favorite: boolean;
  updated_at: string;
}

const statusLabel: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  scheduled: { label: "Agendada", className: "bg-blue-500/15 text-blue-400" },
  running: { label: "Em andamento", className: "bg-emerald-500/15 text-emerald-400" },
  paused: { label: "Pausada", className: "bg-amber-500/15 text-amber-400" },
  completed: { label: "Concluída", className: "bg-emerald-600/15 text-emerald-500" },
  failed: { label: "Falhou", className: "bg-red-500/15 text-red-400" },
  canceled: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
};

export default function EnvioMassa() {
  const { activeCompanyId } = useAuth();
  const [tab, setTab] = useState("campanhas");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<MassCampaign[]>([]);
  const [templates, setTemplates] = useState<MassTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const [{ data: camps }, { data: tmpls }] = await Promise.all([
      supabase.from("mass_campaigns" as any).select("*").eq("tenant_id", activeCompanyId).order("created_at", { ascending: false }),
      supabase.from("mass_templates" as any).select("*").eq("tenant_id", activeCompanyId).order("updated_at", { ascending: false }),
    ]);
    setCampaigns((camps as any) || []);
    setTemplates((tmpls as any) || []);
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh when a campaign row changes (status/totals transitions)
  useEffect(() => {
    if (!activeCompanyId) return;
    const ch = supabase
      .channel(`mass-campaigns-${activeCompanyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mass_campaigns", filter: `tenant_id=eq.${activeCompanyId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeCompanyId, load]);

  const filteredCampaigns = campaigns.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredTemplates = templates.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta campanha?")) return;
    const { error } = await supabase.from("mass_campaigns" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Campanha excluída");
    load();
  };

  const handleTogglePause = async (c: MassCampaign) => {
    const next = c.status === "running" ? "paused" : c.status === "paused" ? "running" : c.status;
    if (next === c.status) return;
    const { error } = await supabase.from("mass_campaigns" as any).update({ status: next }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Send className="w-6 h-6 text-primary" /> Envio em Massa</h1>
          <p className="text-sm text-muted-foreground mt-1">Campanhas de WhatsApp e E-mail para sua base — multi-tenant, com agendamento e controle de velocidade.</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nova campanha</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
            <TabsTrigger value="modelos">Modelos</TabsTrigger>
            <TabsTrigger value="envios">Envios</TabsTrigger>
          </TabsList>
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
          </div>
        </div>

        <TabsContent value="campanhas" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filteredCampaigns.length === 0 ? (
            <EmptyState icon={<Send className="w-10 h-10" />} title="Nenhuma campanha ainda" desc="Crie sua primeira campanha de envio em massa por WhatsApp ou e-mail." action={() => setWizardOpen(true)} />
          ) : filteredCampaigns.map(c => {
            const st = statusLabel[c.status] || statusLabel.draft;
            const totals = c.totals || {};
            return (
              <Card key={c.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {c.channel === "whatsapp" ? <MessageSquare className="w-5 h-5 text-emerald-400" /> : <Mail className="w-5 h-5 text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{c.name}</h3>
                    <Badge className={st.className}>{st.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.channel === "whatsapp" ? "WhatsApp" : "E-mail"} · {totals.sent || 0} enviados · {totals.failed || 0} falhas · criada {formatDistanceToNow(new Date(c.created_at), { locale: ptBR, addSuffix: true })}
                  </p>
                </div>
                {(c.status === "running" || c.status === "paused") && (
                  <Button variant="ghost" size="icon" onClick={() => handleTogglePause(c)}>
                    {c.status === "running" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="modelos" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filteredTemplates.length === 0 ? (
            <EmptyState icon={<MessageSquare className="w-10 h-10" />} title="Nenhum modelo salvo" desc='Salve modelos no editor da campanha clicando em "Salvar modelo".' />
          ) : filteredTemplates.map(t => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center gap-2">
                {t.channel === "whatsapp" ? <MessageSquare className="w-4 h-4 text-emerald-400" /> : <Mail className="w-4 h-4 text-blue-400" />}
                <h3 className="font-semibold">{t.name}</h3>
                {t.is_favorite && <Badge variant="secondary">★ Favorito</Badge>}
                {t.category && <Badge variant="outline">{t.category}</Badge>}
              </div>
              {t.subject && <p className="text-sm text-muted-foreground mt-1"><strong>Assunto:</strong> {t.subject}</p>}
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{t.body}</p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="envios" className="mt-4">
          <EnviosHistory campaigns={filteredCampaigns} />
        </TabsContent>
      </Tabs>

      {wizardOpen && (
        <MassCampaignWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); load(); }}
          tenantId={activeCompanyId || ""}
        />
      )}
    </div>
  );
}

function EmptyState({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: () => void }) {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-xl">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">{icon}</div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">{desc}</p>
      {action && <Button onClick={action} className="gap-2"><Plus className="w-4 h-4" /> Criar campanha</Button>}
    </div>
  );
}

function EnviosHistory({ campaigns }: { campaigns: MassCampaign[] }) {
  const executed = campaigns.filter(c => ["running", "paused", "completed", "failed"].includes(c.status));
  if (executed.length === 0) {
    return <div className="text-center py-16 text-muted-foreground text-sm">Nenhum envio realizado ainda.</div>;
  }
  return (
    <div className="space-y-2">
      {executed.map(c => {
        const t = c.totals || {};
        const total = (t.sent || 0) + (t.failed || 0) + (t.queued || 0);
        return (
          <Card key={c.id} className="p-4 grid grid-cols-6 gap-4 items-center">
            <div className="col-span-2">
              <p className="font-medium truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.channel === "whatsapp" ? "WhatsApp" : "E-mail"}</p>
            </div>
            <Metric label="Total" value={total} />
            <Metric label="Enviados" value={t.sent || 0} tone="emerald" />
            <Metric label="Falhas" value={t.failed || 0} tone="red" />
            <Badge className={statusLabel[c.status]?.className}>{statusLabel[c.status]?.label}</Badge>
          </Card>
        );
      })}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "red" }) {
  const color = tone === "emerald" ? "text-emerald-400" : tone === "red" ? "text-red-400" : "text-foreground";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
