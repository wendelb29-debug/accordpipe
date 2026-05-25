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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Flame, Plus, Users, Thermometer, CalendarCheck2, Loader2, Bot, Upload, ListChecks, Settings2 } from "lucide-react";
import PulseImportTab from "@/components/pulse/PulseImportTab";
import PulseAgentSettingsTab from "@/components/pulse/PulseAgentSettingsTab";
import PulseQueueTab from "@/components/pulse/PulseQueueTab";

type Campaign = any;

export default function AccordPulse() {
  const { profile, role } = useAuth();
  const companyId = useActiveCompanyId();
  const navigate = useNavigate();

  const allowed = role === "admin" || role === "ceo" || role === "comercial" || profile?.is_master;
  useEffect(() => { if (role && !allowed) navigate("/home"); }, [role, allowed, navigate]);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [lostLeads, setLostLeads] = useState<any[]>([]);
  const [selectedLost, setSelectedLost] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({ total: 0, ativos: 0, reunioes: 0, avgTemp: 0 });
  const [form, setForm] = useState({ name: "", objective: "", offer: "", tone: "Humano, consultivo e direto." });

  const activeCampaign = useMemo(() => campaigns.find((c) => c.id === selectedCampaignId) || null, [campaigns, selectedCampaignId]);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase.from("pulse_campaigns" as any).select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      setCampaigns((data as any) || []);
      if (data?.length && !selectedCampaignId) setSelectedCampaignId((data[0] as any).id);
    })();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase.from("crm_leads")
        .select("id, company_name, contact_name, phone, lost_reason, updated_at")
        .eq("servidor_id", companyId).eq("lead_status", "lost")
        .order("updated_at", { ascending: false }).limit(200);
      setLostLeads((data as any) || []);
    })();
  }, [companyId]);

  const refreshMetrics = async () => {
    if (!selectedCampaignId) { setMetrics({ total: 0, ativos: 0, reunioes: 0, avgTemp: 0 }); return; }
    const { data } = await supabase.from("pulse_outbound_leads" as any)
      .select("status, temperature, auto_enabled").eq("campaign_id", selectedCampaignId);
    const arr = (data as any) || [];
    const ativos = arr.filter((p: any) => p.auto_enabled && !["ganho", "perdido", "opt_out"].includes(p.status)).length;
    const reunioes = arr.filter((p: any) => p.status === "reuniao_marcada" || p.status === "meeting").length;
    const avg = arr.length ? Math.round(arr.reduce((s: number, p: any) => s + (p.temperature || 0), 0) / arr.length) : 0;
    setMetrics({ total: arr.length, ativos, reunioes, avgTemp: avg });
  };
  useEffect(() => { refreshMetrics(); }, [selectedCampaignId]);

  const createCampaign = async () => {
    if (!companyId || !form.name.trim()) { toast.error("Nome obrigatório"); return; }
    setLoading(true);
    const { data, error } = await supabase.from("pulse_campaigns" as any).insert({
      company_id: companyId, name: form.name, objective: form.objective, offer: form.offer,
      tone: form.tone || "Humano, consultivo e direto.", created_by: profile?.user_id ?? null,
    } as any).select().single();
    setLoading(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Campanha criada");
    setForm({ name: "", objective: "", offer: "", tone: "Humano, consultivo e direto." });
    setCampaigns((p) => [data as any, ...p]);
    setSelectedCampaignId((data as any).id);
  };

  const addLostToPulse = async () => {
    if (!selectedCampaignId || !selectedLost.size) return;
    const rows = Array.from(selectedLost).map((id) => ({
      campaign_id: selectedCampaignId, crm_lead_id: id, status: "aguardando_inicio",
      stage: "abertura", temperature: 15, auto_enabled: true,
    }));
    const { error } = await supabase.from("pulse_outbound_leads" as any).insert(rows as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} lead(s) adicionados`);
    setSelectedLost(new Set());
    refreshMetrics();
  };

  if (!allowed) return null;

  return (
    <PageContainer size="wide">
      <PageHeader
        icon={Flame}
        iconClassName="bg-orange-500/15 text-orange-500"
        title="Accord Pulse"
        description="Agente autônomo de negociação por WhatsApp. Importe leads, configure os guardrails e deixe a IA conduzir a conversa."
        actions={
          activeCampaign && (
            <Badge variant="secondary" className="text-xs">
              Campanha: <span className="ml-1 font-semibold">{activeCampaign.name}</span>
            </Badge>
          )
        }
      >
        <Label className="text-xs text-muted-foreground">Campanha:</Label>
        <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
          <SelectTrigger className="h-9 w-[300px]"><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
          <SelectContent>{campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="Leads na campanha" value={metrics.total} icon={Users} />
        <Metric label="Em automático" value={metrics.ativos} icon={Bot} accent="emerald" />
        <Metric label="Reuniões marcadas" value={metrics.reunioes} icon={CalendarCheck2} accent="emerald" />
        <Metric label="Temperatura média" value={`${metrics.avgTemp}°`} icon={Thermometer} accent="rose" />
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue"><ListChecks className="h-3.5 w-3.5 mr-1" />Fila outbound</TabsTrigger>
          <TabsTrigger value="import"><Upload className="h-3.5 w-3.5 mr-1" />Importar leads</TabsTrigger>
          <TabsTrigger value="agent"><Bot className="h-3.5 w-3.5 mr-1" />Agente IA</TabsTrigger>
          <TabsTrigger value="lost">Descartados</TabsTrigger>
          <TabsTrigger value="campaign"><Settings2 className="h-3.5 w-3.5 mr-1" />Campanha</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <PulseQueueTab companyId={companyId} campaignId={selectedCampaignId} campaign={activeCampaign} />
        </TabsContent>

        <TabsContent value="import">
          <PulseImportTab companyId={companyId} campaigns={campaigns} selectedCampaignId={selectedCampaignId} onImported={refreshMetrics} />
        </TabsContent>

        <TabsContent value="agent">
          <PulseAgentSettingsTab campaignId={selectedCampaignId} />
        </TabsContent>

        <TabsContent value="lost" className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-muted-foreground">{lostLeads.length} descartado(s) • {selectedLost.size} selecionado(s)</div>
            <Button onClick={addLostToPulse} disabled={!selectedLost.size || !selectedCampaignId} size="sm">
              <Plus className="h-4 w-4 mr-1" />Adicionar ao Pulse
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr><th className="p-2 w-10"></th><th className="p-2 text-left">Empresa</th><th className="p-2 text-left">Contato</th><th className="p-2 text-left">Telefone</th><th className="p-2 text-left">Motivo</th></tr>
                </thead>
                <tbody>
                  {lostLeads.map((l) => (
                    <tr key={l.id} className="border-t border-border/40 hover:bg-muted/30">
                      <td className="p-2"><Checkbox checked={selectedLost.has(l.id)} onCheckedChange={(c) => setSelectedLost((p) => { const n = new Set(p); if (c) n.add(l.id); else n.delete(l.id); return n; })} /></td>
                      <td className="p-2 font-medium">{l.company_name}</td>
                      <td className="p-2">{l.contact_name || "—"}</td>
                      <td className="p-2">{l.phone || "—"}</td>
                      <td className="p-2 text-muted-foreground">{l.lost_reason || "—"}</td>
                    </tr>
                  ))}
                  {!lostLeads.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum lead descartado.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaign" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" />Nova campanha</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Objetivo</Label><Input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} /></div>
              <div><Label>Oferta</Label><Textarea rows={2} value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} /></div>
              <div><Label>Tom</Label><Input value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} /></div>
              <Button onClick={createCampaign} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Criar campanha
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Campanhas existentes</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Nome</th><th className="p-2 text-left">Objetivo</th></tr></thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className={`border-t border-border/40 cursor-pointer hover:bg-muted/30 ${selectedCampaignId === c.id ? "bg-muted/40" : ""}`} onClick={() => setSelectedCampaignId(c.id)}>
                      <td className="p-2 font-medium">{c.name}</td>
                      <td className="p-2 text-muted-foreground truncate max-w-[400px]">{c.objective || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value, icon: Icon, accent = "primary" }: any) {
  const colors: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    emerald: "bg-emerald-500/15 text-emerald-500",
    rose: "bg-rose-500/15 text-rose-500",
  };
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colors[accent]}`}><Icon className="h-5 w-5" /></div>
      <div><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-bold leading-tight">{value}</div></div>
    </CardContent></Card>
  );
}
