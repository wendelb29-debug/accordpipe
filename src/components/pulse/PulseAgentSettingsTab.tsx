import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, Save, Loader2, BookOpen, Plus, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";

type Settings = any;
type KB = { id?: string; campaign_id: string; title: string; type: string; content: string; priority: number; is_active: boolean };

const DAYS = [
  { v: 1, l: "Seg" }, { v: 2, l: "Ter" }, { v: 3, l: "Qua" },
  { v: 4, l: "Qui" }, { v: 5, l: "Sex" }, { v: 6, l: "Sáb" }, { v: 0, l: "Dom" },
];
const KB_TYPES = [
  { v: "texto", l: "Texto livre" },
  { v: "faq", l: "FAQ" },
  { v: "oferta", l: "Oferta" },
  { v: "objecoes", l: "Objeções" },
  { v: "politica", l: "Política comercial" },
  { v: "case", l: "Case / prova social" },
  { v: "script", l: "Script" },
];

const DEFAULTS = (campaign_id: string): Settings => ({
  campaign_id,
  enabled: false,
  starts_at: null, ends_at: null,
  send_window_start: "09:00", send_window_end: "18:00",
  send_weekdays: [1, 2, 3, 4, 5], timezone: "America/Sao_Paulo",
  min_delay_minutes: 3, max_delay_minutes: 12,
  daily_limit: 40, max_messages_per_lead: 8, max_negotiation_days: 14,
  auto_pause_on_end_date: true, auto_reply_inbound: true, auto_start_conversations: false,
  require_approval_first_message: true, require_approval_sensitive_objection: true,
  stop_on_opt_out: true, stop_on_human_request: true, stop_on_meeting: true, block_outside_window: true,
  tone: "Humano, consultivo, breve e natural.",
  playbook: "", known_objections: "", main_offer: "", scheduling_instructions: "",
});

function toLocalInput(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PulseAgentSettingsTab({ campaignId }: { campaignId: string }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS(campaignId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kb, setKb] = useState<KB[]>([]);
  const [newKb, setNewKb] = useState<KB>({ campaign_id: campaignId, title: "", type: "texto", content: "", priority: 1, is_active: true });

  useEffect(() => {
    if (!campaignId) return;
    (async () => {
      setLoading(true);
      const [{ data: s }, { data: k }] = await Promise.all([
        supabase.from("pulse_agent_settings" as any).select("*").eq("campaign_id", campaignId).maybeSingle(),
        supabase.from("pulse_knowledge_base" as any).select("*").eq("campaign_id", campaignId).order("priority", { ascending: false }),
      ]);
      if (s) {
        const ss = s as any;
        setSettings({
          ...DEFAULTS(campaignId), ...ss,
          send_window_start: (ss.send_window_start || "09:00").slice(0, 5),
          send_window_end: (ss.send_window_end || "18:00").slice(0, 5),
        });
      } else {
        setSettings(DEFAULTS(campaignId));
      }
      setKb((k as any) || []);
      setNewKb({ campaign_id: campaignId, title: "", type: "texto", content: "", priority: 1, is_active: true });
      setLoading(false);
    })();
  }, [campaignId]);

  const save = async () => {
    setSaving(true);
    const payload: any = { ...settings, campaign_id: campaignId };
    const { error } = settings.id
      ? await supabase.from("pulse_agent_settings" as any).update(payload).eq("id", settings.id)
      : await supabase.from("pulse_agent_settings" as any).upsert(payload, { onConflict: "campaign_id" });
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configurações salvas");
  };

  const toggleDay = (d: number) => {
    setSettings((p: any) => ({
      ...p, send_weekdays: p.send_weekdays.includes(d) ? p.send_weekdays.filter((x: number) => x !== d) : [...p.send_weekdays, d].sort(),
    }));
  };

  const addKb = async () => {
    if (!newKb.title.trim() || !newKb.content.trim()) { toast.error("Título e conteúdo obrigatórios"); return; }
    const { data, error } = await supabase.from("pulse_knowledge_base" as any).insert({ ...newKb, campaign_id: campaignId } as any).select().single();
    if (error) { toast.error(error.message); return; }
    setKb((p) => [data as any, ...p]);
    setNewKb({ campaign_id: campaignId, title: "", type: "texto", content: "", priority: 1, is_active: true });
    toast.success("Material adicionado");
  };
  const updateKb = async (id: string, patch: Partial<KB>) => {
    const { error } = await supabase.from("pulse_knowledge_base" as any).update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
    else setKb((p) => p.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  };
  const removeKb = async (id: string) => {
    if (!confirm("Remover material?")) return;
    const { error } = await supabase.from("pulse_knowledge_base" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else setKb((p) => p.filter((k) => k.id !== id));
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!campaignId) return <div className="p-8 text-center text-muted-foreground">Selecione uma campanha.</div>;

  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/30">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Agente IA</div>
              <div className="text-xs text-muted-foreground">
                {settings.enabled ? "Ativo — negociando autonomamente dentro dos limites." : "Desligado — operador conduz manualmente."}
              </div>
            </div>
          </div>
          <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4" />Período da campanha</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Início">
                <Input type="datetime-local" value={toLocalInput(settings.starts_at)}
                  onChange={(e) => setSettings({ ...settings, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </Field>
              <Field label="Fim">
                <Input type="datetime-local" value={toLocalInput(settings.ends_at)}
                  onChange={(e) => setSettings({ ...settings, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Horário inicial diário">
                <Input type="time" value={settings.send_window_start} onChange={(e) => setSettings({ ...settings, send_window_start: e.target.value })} />
              </Field>
              <Field label="Horário final diário">
                <Input type="time" value={settings.send_window_end} onChange={(e) => setSettings({ ...settings, send_window_end: e.target.value })} />
              </Field>
            </div>
            <div>
              <Label className="text-xs">Dias ativos</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {DAYS.map((d) => (
                  <Button key={d.v} type="button" size="sm"
                    variant={settings.send_weekdays.includes(d.v) ? "default" : "outline"}
                    className="h-8 px-3" onClick={() => toggleDay(d.v)}>{d.l}</Button>
                ))}
              </div>
            </div>
            <Field label="Timezone">
              <Input value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Limites e cadência</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Delay mín. (min)">
                <Input type="number" value={settings.min_delay_minutes} onChange={(e) => setSettings({ ...settings, min_delay_minutes: Number(e.target.value) })} />
              </Field>
              <Field label="Delay máx. (min)">
                <Input type="number" value={settings.max_delay_minutes} onChange={(e) => setSettings({ ...settings, max_delay_minutes: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Limite diário (toda campanha)">
              <Input type="number" value={settings.daily_limit} onChange={(e) => setSettings({ ...settings, daily_limit: Number(e.target.value) })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Máx. msgs/lead">
                <Input type="number" value={settings.max_messages_per_lead} onChange={(e) => setSettings({ ...settings, max_messages_per_lead: Number(e.target.value) })} />
              </Field>
              <Field label="Máx. dias em negociação">
                <Input type="number" value={settings.max_negotiation_days} onChange={(e) => setSettings({ ...settings, max_negotiation_days: Number(e.target.value) })} />
              </Field>
            </div>
            <ToggleRow label="Pausar campanha ao chegar na data final" checked={settings.auto_pause_on_end_date}
              onChange={(v) => setSettings({ ...settings, auto_pause_on_end_date: v })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Comportamento</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <ToggleRow label="Responder automaticamente leads inbound" checked={settings.auto_reply_inbound}
              onChange={(v) => setSettings({ ...settings, auto_reply_inbound: v })} />
            <ToggleRow label="Iniciar conversas automaticamente" checked={settings.auto_start_conversations}
              onChange={(v) => setSettings({ ...settings, auto_start_conversations: v })} />
            <ToggleRow label="Exigir aprovação antes do primeiro envio" checked={settings.require_approval_first_message}
              onChange={(v) => setSettings({ ...settings, require_approval_first_message: v })} />
            <ToggleRow label="Exigir aprovação em objeção sensível" checked={settings.require_approval_sensitive_objection}
              onChange={(v) => setSettings({ ...settings, require_approval_sensitive_objection: v })} />
            <ToggleRow label="Não enviar fora do horário configurado" checked={settings.block_outside_window}
              onChange={(v) => setSettings({ ...settings, block_outside_window: v })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Parar quando o lead...</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <ToggleRow label="Pedir humano / atendente" checked={settings.stop_on_human_request}
              onChange={(v) => setSettings({ ...settings, stop_on_human_request: v })} />
            <ToggleRow label="Pedir para parar (opt-out)" checked={settings.stop_on_opt_out}
              onChange={(v) => setSettings({ ...settings, stop_on_opt_out: v })} />
            <ToggleRow label="Marcar reunião" checked={settings.stop_on_meeting}
              onChange={(v) => setSettings({ ...settings, stop_on_meeting: v })} />
            <div className="pt-2">
              <Label className="text-xs">Tom da IA</Label>
              <Textarea rows={3} value={settings.tone}
                onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                placeholder="Humano, consultivo, breve e natural." />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Salvar configurações
        </Button>
      </div>

      {/* Knowledge base */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />Base de conhecimento da campanha
            <Badge variant="secondary" className="ml-2">{kb.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border border-border/60 rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_120px] gap-2">
              <Input placeholder="Título" value={newKb.title} onChange={(e) => setNewKb({ ...newKb, title: e.target.value })} />
              <Select value={newKb.type} onValueChange={(v) => setNewKb({ ...newKb, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KB_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Prioridade" value={newKb.priority}
                onChange={(e) => setNewKb({ ...newKb, priority: Number(e.target.value) })} />
            </div>
            <Textarea rows={3} placeholder="Conteúdo (ex: oferta, FAQ, política, case...)"
              value={newKb.content} onChange={(e) => setNewKb({ ...newKb, content: e.target.value })} />
            <div className="flex justify-end">
              <Button size="sm" onClick={addKb}><Plus className="h-4 w-4 mr-1" />Adicionar material</Button>
            </div>
          </div>

          {kb.map((item) => (
            <div key={item.id} className="border border-border/60 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="uppercase text-xs">{item.type}</Badge>
                <Input className="h-8 flex-1 min-w-[160px]" value={item.title}
                  onBlur={(e) => updateKb(item.id!, { title: e.target.value })}
                  onChange={(e) => setKb((p) => p.map((k) => k.id === item.id ? { ...k, title: e.target.value } : k))} />
                <Input className="h-8 w-20" type="number" value={item.priority}
                  onBlur={(e) => updateKb(item.id!, { priority: Number(e.target.value) })}
                  onChange={(e) => setKb((p) => p.map((k) => k.id === item.id ? { ...k, priority: Number(e.target.value) } : k))} />
                <div className="flex items-center gap-2 text-xs">
                  <Switch checked={item.is_active} onCheckedChange={(v) => updateKb(item.id!, { is_active: v })} />
                  <span>Ativo</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeKb(item.id!)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Textarea rows={3} value={item.content}
                onBlur={(e) => updateKb(item.id!, { content: e.target.value })}
                onChange={(e) => setKb((p) => p.map((k) => k.id === item.id ? { ...k, content: e.target.value } : k))} />
            </div>
          ))}
          {!kb.length && <div className="text-sm text-muted-foreground text-center py-4">Nenhum material ainda. Adicione ofertas, FAQs, objeções e cases para a IA usar.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: any) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}
function ToggleRow({ label, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
