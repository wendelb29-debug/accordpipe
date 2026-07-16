import { useInactivityRules } from "@/hooks/useChatbotAutomation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save, RotateCcw } from "lucide-react";

export function AutomacaoInatividadePanel() {
  const { rules, setRules, loading, saving, dirty, save, discard } = useInactivityRules();

  if (loading) return <div className="py-8 flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…</div>;

  const patch = (p: Partial<typeof rules>) => setRules({ ...rules, ...p });

  return (
    <div className="space-y-4">
      <StageCard
        title="1º aviso de inatividade"
        enabled={rules.first_warning_enabled}
        onEnabled={(v) => patch({ first_warning_enabled: v })}
        minutes={rules.first_warning_after_minutes}
        onMinutes={(v) => patch({ first_warning_after_minutes: v })}
        message={rules.first_warning_message}
        onMessage={(v) => patch({ first_warning_message: v })}
        minutesLabel="Enviar após (minutos)"
      />

      <StageCard
        title="2º aviso de inatividade"
        enabled={rules.second_warning_enabled}
        onEnabled={(v) => patch({ second_warning_enabled: v })}
        minutes={rules.second_warning_after_minutes}
        onMinutes={(v) => patch({ second_warning_after_minutes: v })}
        message={rules.second_warning_message}
        onMessage={(v) => patch({ second_warning_message: v })}
        minutesLabel="Enviar após novo período (minutos)"
      />

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Encerramento automático</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Encerra a conversa após tempo total de inatividade.</p>
          </div>
          <Switch checked={rules.auto_close_enabled} onCheckedChange={(v) => patch({ auto_close_enabled: v })} />
        </div>

        {rules.auto_close_enabled && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs">Encerrar após (minutos)</Label>
                <Input type="number" min={1} value={rules.auto_close_after_minutes}
                  onChange={(e) => patch({ auto_close_after_minutes: parseInt(e.target.value) || 1 })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">Tag aplicada no encerramento (opcional)</Label>
                <Input value={rules.close_tag ?? ""} onChange={(e) => patch({ close_tag: e.target.value || null })} className="mt-1.5" placeholder="Ex: inatividade" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Mensagem final</Label>
              <Textarea value={rules.close_message} onChange={(e) => patch({ close_message: e.target.value })} rows={2} className="mt-1.5" />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={rules.reopen_on_new_message} onChange={(e) => patch({ reopen_on_new_message: e.target.checked })} />
                Reabrir automaticamente se o cliente responder
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={rules.create_summary} onChange={(e) => patch({ create_summary: e.target.checked })} />
                Criar resumo da conversa
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={rules.create_followup_task} onChange={(e) => patch({ create_followup_task: e.target.checked })} />
                Criar tarefa de retorno
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
        {dirty && <span className="text-xs text-amber-500 mr-auto">Alterações não salvas</span>}
        <Button variant="ghost" size="sm" onClick={discard} disabled={!dirty || saving}><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Descartar</Button>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

function StageCard({ title, enabled, onEnabled, minutes, onMinutes, message, onMessage, minutesLabel }: any) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{title}</Label>
        <Switch checked={enabled} onCheckedChange={onEnabled} />
      </div>
      {enabled && (
        <div className="space-y-3 pt-3 border-t border-border/50">
          <div>
            <Label className="text-xs">{minutesLabel}</Label>
            <Input type="number" min={1} value={minutes} onChange={(e) => onMinutes(parseInt(e.target.value) || 1)} className="mt-1.5 w-40" />
          </div>
          <div>
            <Label className="text-xs">Mensagem</Label>
            <Textarea value={message} onChange={(e) => onMessage(e.target.value)} rows={2} className="mt-1.5" />
          </div>
        </div>
      )}
    </div>
  );
}
