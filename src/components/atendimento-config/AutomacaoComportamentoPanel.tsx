import { useCommunicationSettings } from "@/hooks/useChatbotAutomation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Save, RotateCcw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AutomacaoComportamentoPanel() {
  const { settings, setSettings, loading, saving, dirty, save, discard } = useCommunicationSettings();

  if (loading) return <div className="py-8 flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…</div>;

  const s = settings;
  const update = (patch: Partial<typeof s>) => setSettings({ ...s, ...patch });

  return (
    <div className="space-y-6">
      {!s.auto_reply_enabled && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            O agente de IA está <b>desativado</b>. As mensagens continuam sendo recebidas normalmente, mas nenhuma resposta automática será enviada.
          </AlertDescription>
        </Alert>
      )}

      <SwitchRow
        label="Ativar respostas automáticas deste agente"
        desc="Quando desativado, o agente para de responder mas as conversas continuam funcionando."
        checked={s.auto_reply_enabled}
        onChange={(v) => update({ auto_reply_enabled: v })}
      />

      <SwitchRow
        label="Responder automaticamente novas conversas"
        desc="Responde à primeira mensagem recebida, respeitando canal, horário e regras."
        checked={s.reply_new_conversations}
        onChange={(v) => update({ reply_new_conversations: v })}
      />

      <SwitchRow
        label="Responder mensagens em conversas já iniciadas"
        desc="Permite ao agente continuar conversas existentes usando o histórico autorizado."
        checked={s.reply_existing_conversations}
        onChange={(v) => update({ reply_existing_conversations: v })}
      />

      <div className="grid gap-4 md:grid-cols-2 rounded-xl border border-border p-4">
        <div>
          <Label>Tempo de espera antes de responder</Label>
          <Select value={String(s.reply_delay_seconds)} onValueChange={(v) => update({ reply_delay_seconds: parseInt(v) })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Imediatamente</SelectItem>
              <SelectItem value="2">2 segundos</SelectItem>
              <SelectItem value="5">5 segundos</SelectItem>
              <SelectItem value="10">10 segundos</SelectItem>
              <SelectItem value="15">15 segundos</SelectItem>
              <SelectItem value="30">30 segundos</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1.5">Se o cliente enviar outra mensagem durante a espera, todas serão agrupadas.</p>
        </div>
        <div>
          <Label>Ação quando o limite for atingido</Label>
          <Select value={s.on_limit_reached} onValueChange={(v: any) => update({ on_limit_reached: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="transfer">Transferir para equipe</SelectItem>
              <SelectItem value="request_human">Solicitar atendimento humano</SelectItem>
              <SelectItem value="create_task">Criar tarefa</SelectItem>
              <SelectItem value="wait">Permanecer aguardando</SelectItem>
              <SelectItem value="close">Encerrar atendimento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <SwitchRow
          label="Agrupar mensagens consecutivas do cliente"
          desc="Aguarda um intervalo entre mensagens antes de gerar uma única resposta com todas."
          checked={s.message_grouping_enabled}
          onChange={(v) => update({ message_grouping_enabled: v })}
          compact
        />
        {s.message_grouping_enabled && (
          <div className="pt-2 border-t border-border/50">
            <Label className="text-xs">Janela de agrupamento (segundos)</Label>
            <Input
              type="number" min={1} max={30}
              value={s.message_grouping_window_seconds}
              onChange={(e) => update({ message_grouping_window_seconds: Math.max(1, Math.min(30, parseInt(e.target.value) || 1)) })}
              className="mt-1.5 w-32"
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3 rounded-xl border border-border p-4">
        <NumberField label="Máx. respostas seguidas" value={s.max_consecutive_replies} onChange={(v) => update({ max_consecutive_replies: v })} />
        <NumberField label="Máx. tentativas de coletar dado" value={s.max_data_retry_attempts} onChange={(v) => update({ max_data_retry_attempts: v })} />
        <NumberField label="Máx. mensagens antes de sugerir humano" value={s.max_messages_before_handoff} onChange={(v) => update({ max_messages_before_handoff: v })} />
      </div>

      <FooterBar dirty={dirty} saving={saving} onSave={save} onDiscard={discard} />
    </div>
  );
}

function SwitchRow({ label, desc, checked, onChange, compact }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; compact?: boolean }) {
  return (
    <div className={compact ? "flex items-center justify-between" : "flex items-center justify-between rounded-xl border border-border p-4"}>
      <div className="pr-4">
        <Label className="text-sm font-medium">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))} className="mt-1.5" />
    </div>
  );
}

function FooterBar({ dirty, saving, onSave, onDiscard }: { dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
      {dirty && <span className="text-xs text-amber-500 mr-auto">Alterações não salvas</span>}
      <Button variant="ghost" size="sm" onClick={onDiscard} disabled={!dirty || saving}><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Descartar</Button>
      <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
        Salvar alterações
      </Button>
    </div>
  );
}
