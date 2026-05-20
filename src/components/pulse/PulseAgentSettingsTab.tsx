import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bot, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Settings = {
  id?: string;
  campaign_id: string;
  enabled: boolean;
  daily_limit: number;
  send_window_start: string;
  send_window_end: string;
  send_weekdays: number[];
  min_delay_minutes: number;
  max_delay_minutes: number;
  max_attempts_per_lead: number;
  stop_on_opt_out: boolean;
  stop_on_human_request: boolean;
  stop_on_meeting: boolean;
  playbook: string;
  known_objections: string;
  main_offer: string;
  scheduling_instructions: string;
  tone: string;
};

const DAYS = [
  { v: 1, l: "Seg" }, { v: 2, l: "Ter" }, { v: 3, l: "Qua" },
  { v: 4, l: "Qui" }, { v: 5, l: "Sex" }, { v: 6, l: "Sáb" }, { v: 0, l: "Dom" },
];

const DEFAULTS = (campaign_id: string): Settings => ({
  campaign_id,
  enabled: false,
  daily_limit: 40,
  send_window_start: "09:00",
  send_window_end: "18:00",
  send_weekdays: [1, 2, 3, 4, 5],
  min_delay_minutes: 45,
  max_delay_minutes: 180,
  max_attempts_per_lead: 6,
  stop_on_opt_out: true,
  stop_on_human_request: true,
  stop_on_meeting: true,
  playbook: "",
  known_objections: "",
  main_offer: "",
  scheduling_instructions: "",
  tone: "Humano, consultivo, breve e natural.",
});

export default function PulseAgentSettingsTab({ campaignId }: { campaignId: string }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS(campaignId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pulse_agent_settings" as any)
        .select("*").eq("campaign_id", campaignId).maybeSingle();
      if (data) {
        const s = data as any;
        setSettings({
          ...DEFAULTS(campaignId),
          ...s,
          send_window_start: (s.send_window_start || "09:00").slice(0, 5),
          send_window_end: (s.send_window_end || "18:00").slice(0, 5),
        });
      } else {
        setSettings(DEFAULTS(campaignId));
      }
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
    else toast.success("Configurações do agente salvas");
  };

  const toggleDay = (d: number) => {
    setSettings((prev) => ({
      ...prev,
      send_weekdays: prev.send_weekdays.includes(d)
        ? prev.send_weekdays.filter((x) => x !== d)
        : [...prev.send_weekdays, d].sort(),
    }));
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
          <CardHeader><CardTitle className="text-sm">Limites e cadência</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Limite diário de mensagens (toda a campanha)">
              <Input type="number" value={settings.daily_limit}
                onChange={(e) => setSettings({ ...settings, daily_limit: Number(e.target.value) })} />
            </Field>
            <Field label="Máximo de tentativas por lead">
              <Input type="number" value={settings.max_attempts_per_lead}
                onChange={(e) => setSettings({ ...settings, max_attempts_per_lead: Number(e.target.value) })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Delay mín. (min)">
                <Input type="number" value={settings.min_delay_minutes}
                  onChange={(e) => setSettings({ ...settings, min_delay_minutes: Number(e.target.value) })} />
              </Field>
              <Field label="Delay máx. (min)">
                <Input type="number" value={settings.max_delay_minutes}
                  onChange={(e) => setSettings({ ...settings, max_delay_minutes: Number(e.target.value) })} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Janela de envio</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Horário inicial">
                <Input type="time" value={settings.send_window_start}
                  onChange={(e) => setSettings({ ...settings, send_window_start: e.target.value })} />
              </Field>
              <Field label="Horário final">
                <Input type="time" value={settings.send_window_end}
                  onChange={(e) => setSettings({ ...settings, send_window_end: e.target.value })} />
              </Field>
            </div>
            <div>
              <Label className="text-xs">Dias da semana</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {DAYS.map((d) => (
                  <Button key={d.v}
                    type="button"
                    size="sm"
                    variant={settings.send_weekdays.includes(d.v) ? "default" : "outline"}
                    className="h-8 px-3"
                    onClick={() => toggleDay(d.v)}>
                    {d.l}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Parar quando o lead...</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <ToggleRow label="Pedir para parar (opt-out)" checked={settings.stop_on_opt_out}
              onChange={(v) => setSettings({ ...settings, stop_on_opt_out: v })} />
            <ToggleRow label="Pedir humano / atendente" checked={settings.stop_on_human_request}
              onChange={(v) => setSettings({ ...settings, stop_on_human_request: v })} />
            <ToggleRow label="Agendar reunião" checked={settings.stop_on_meeting}
              onChange={(v) => setSettings({ ...settings, stop_on_meeting: v })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Tom da IA</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={4} value={settings.tone}
              onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
              placeholder="Ex: Humano, consultivo, breve e natural. Tutea, sem corporativês." />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Playbook comercial</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Oferta principal">
            <Textarea rows={3} value={settings.main_offer}
              onChange={(e) => setSettings({ ...settings, main_offer: e.target.value })}
              placeholder="Descreva a oferta, valor entregue, diferenciais." />
          </Field>
          <Field label="Playbook (como conduzir a conversa)">
            <Textarea rows={5} value={settings.playbook}
              onChange={(e) => setSettings({ ...settings, playbook: e.target.value })}
              placeholder="Passo 1: abertura curta com contexto. Passo 2: diagnóstico. Passo 3: prova. Passo 4: agenda." />
          </Field>
          <Field label="Objeções conhecidas e respostas">
            <Textarea rows={5} value={settings.known_objections}
              onChange={(e) => setSettings({ ...settings, known_objections: e.target.value })}
              placeholder="Ex: 'caro' → comparar com custo de não resolver. 'sem tempo' → propor 10 min." />
          </Field>
          <Field label="Instruções de agendamento (link, horários, formato)">
            <Textarea rows={3} value={settings.scheduling_instructions}
              onChange={(e) => setSettings({ ...settings, scheduling_instructions: e.target.value })}
              placeholder="Ex: Sugerir reunião de 15 min. Link: https://cal.com/seu-time" />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (<div><Label className="text-xs">{label}</Label>{children}</div>);
}
function ToggleRow({ label, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
