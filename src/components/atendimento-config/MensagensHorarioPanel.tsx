import { useServiceSettings } from "./useServiceSettings";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function MensagensHorarioPanel() {
  const { settings, loading, saving, save, update } = useServiceSettings();
  if (loading || !settings) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  const updateHour = (day: number, patch: Partial<{ enabled: boolean; start: string; end: string; message: string }>) => {
    const list = [...settings.business_hours];
    list[day] = { ...list[day], ...patch };
    update("business_hours", list);
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-sm mb-2">Mensagens automáticas</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Entrada (saudação)</Label><Textarea rows={2} value={settings.msg_greeting || ""} onChange={e => update("msg_greeting", e.target.value)} placeholder="Olá! Um de nossos atendentes já vai te atender." /></div>
          <div><Label>Transferência</Label><Textarea rows={2} value={settings.msg_transfer || ""} onChange={e => update("msg_transfer", e.target.value)} placeholder="Estou te transferindo para o setor mais indicado." /></div>
          <div><Label>Espera</Label><Textarea rows={2} value={settings.msg_wait || ""} onChange={e => update("msg_wait", e.target.value)} placeholder="Aguarde um instante, já retomamos com você." /></div>
          <div><Label>Finalização</Label><Textarea rows={2} value={settings.msg_closing || ""} onChange={e => update("msg_closing", e.target.value)} placeholder="Obrigado pelo contato! Encerramos o atendimento." /></div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-2">Horário de atendimento</h4>
        <div className="space-y-2">
          {settings.business_hours.map((h, i) => (
            <div key={i} className="grid grid-cols-[100px_60px_1fr_1fr_2fr] gap-2 items-center p-2 border rounded-lg">
              <span className="text-sm font-medium">{DAYS[i]}</span>
              <Switch checked={h.enabled} onCheckedChange={(v) => updateHour(i, { enabled: v })} />
              <Input type="time" value={h.start} onChange={(e) => updateHour(i, { start: e.target.value })} disabled={!h.enabled} />
              <Input type="time" value={h.end} onChange={(e) => updateHour(i, { end: e.target.value })} disabled={!h.enabled} />
              <Input value={h.message || ""} onChange={(e) => updateHour(i, { message: e.target.value })} placeholder="Mensagem fora do expediente (opcional)" />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Label>Mensagem geral fora do expediente</Label>
          <Textarea rows={2} value={settings.off_hours_message || ""} onChange={e => update("off_hours_message", e.target.value)} placeholder="Estamos fora do horário. Retornamos assim que possível." />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save(settings)} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Salvar
        </Button>
      </div>
    </div>
  );
}
