import { useBusinessHours, type DaySchedule } from "@/hooks/useChatbotAutomation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, RotateCcw, Plus, Trash2 } from "lucide-react";

const DAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const TIMEZONES = [
  "America/Sao_Paulo", "America/Fortaleza", "America/Manaus",
  "America/Belem", "America/Recife", "America/Cuiaba",
  "America/Bahia", "America/Campo_Grande", "America/Porto_Velho",
];

export function AutomacaoHorariosPanel() {
  const { hours, setHours, loading, saving, dirty, save, discard } = useBusinessHours();

  if (loading) return <div className="py-8 flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…</div>;

  const setDay = (idx: number, patch: Partial<DaySchedule>) => {
    const next = [...hours.weekly_schedule];
    next[idx] = { ...next[idx], ...patch };
    setHours({ ...hours, weekly_schedule: next });
  };

  const addInterval = (idx: number) => {
    const d = hours.weekly_schedule[idx];
    setDay(idx, { intervals: [...(d.intervals ?? []), { start: "09:00", end: "18:00" }] });
  };
  const removeInterval = (idx: number, i: number) => {
    const d = hours.weekly_schedule[idx];
    setDay(idx, { intervals: d.intervals.filter((_, k) => k !== i) });
  };
  const updateInterval = (idx: number, i: number, field: "start" | "end", value: string) => {
    const d = hours.weekly_schedule[idx];
    const next = d.intervals.map((iv, k) => (k === i ? { ...iv, [field]: value } : iv));
    setDay(idx, { intervals: next });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Fuso horário</Label>
          <Select value={hours.timezone} onValueChange={(v) => setHours({ ...hours, timezone: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Comportamento fora do horário</Label>
          <Select value={hours.off_hours_behavior} onValueChange={(v: any) => setHours({ ...hours, off_hours_behavior: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ai_replies">IA continua atendendo normalmente</SelectItem>
              <SelectItem value="ai_simple_only">IA responde apenas perguntas simples</SelectItem>
              <SelectItem value="collect_data">IA coleta dados do cliente</SelectItem>
              <SelectItem value="inform_and_close">Informa horário e encerra</SelectItem>
              <SelectItem value="create_callback">Cria solicitação de retorno</SelectItem>
              <SelectItem value="forward_to_oncall">Encaminha para equipe de plantão</SelectItem>
              <SelectItem value="no_reply">IA não responde</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        {DAYS.map((day, idx) => {
          const d = hours.weekly_schedule[idx];
          if (!d) return null;
          return (
            <div key={day} className="border-b border-border last:border-b-0">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Switch checked={d.enabled} onCheckedChange={(v) => setDay(idx, { enabled: v, intervals: v && d.intervals.length === 0 ? [{ start: "09:00", end: "18:00" }] : d.intervals })} />
                  <span className={`text-sm font-medium ${!d.enabled ? "text-muted-foreground line-through" : ""}`}>{day}</span>
                </div>
                {d.enabled && (
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input type="checkbox" checked={d.all_day} onChange={(e) => setDay(idx, { all_day: e.target.checked })} />
                      24 horas
                    </label>
                    {!d.all_day && (
                      <Button variant="ghost" size="sm" onClick={() => addInterval(idx)} className="h-7 text-xs">
                        <Plus className="h-3 w-3 mr-1" /> Intervalo
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {d.enabled && !d.all_day && (
                <div className="px-4 py-3 space-y-2">
                  {d.intervals.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum intervalo configurado.</p>}
                  {d.intervals.map((iv, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="time" value={iv.start} onChange={(e) => updateInterval(idx, i, "start", e.target.value)} className="w-32" />
                      <span className="text-muted-foreground text-sm">até</span>
                      <Input type="time" value={iv.end} onChange={(e) => updateInterval(idx, i, "end", e.target.value)} className="w-32" />
                      <Button variant="ghost" size="icon" onClick={() => removeInterval(idx, i)} className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
        {dirty && <span className="text-xs text-amber-500 mr-auto">Alterações não salvas</span>}
        <Button variant="ghost" size="sm" onClick={discard} disabled={!dirty || saving}><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Descartar</Button>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Salvar horários
        </Button>
      </div>
    </div>
  );
}
