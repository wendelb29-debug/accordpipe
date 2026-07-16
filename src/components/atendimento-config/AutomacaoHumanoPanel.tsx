import { useCommunicationSettings } from "@/hooks/useChatbotAutomation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, RotateCcw } from "lucide-react";

export function AutomacaoHumanoPanel() {
  const { settings, setSettings, loading, saving, dirty, save, discard } = useCommunicationSettings();

  if (loading) return <div className="py-8 flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…</div>;

  const patch = (p: Partial<typeof settings>) => setSettings({ ...settings, ...p });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div className="pr-4">
          <Label className="text-sm font-medium">Pausar respostas automáticas quando um atendente responder</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Ao ativar, o agente para imediatamente ao humano assumir a conversa e não retoma sem regra.</p>
        </div>
        <Switch checked={settings.pause_ai_on_human_reply} onCheckedChange={(v) => patch({ pause_ai_on_human_reply: v })} />
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div>
          <Label className="text-sm font-medium">Como retomar a IA</Label>
          <Select value={settings.resume_ai_mode} onValueChange={(v: any) => patch({ resume_ai_mode: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Nunca retomar automaticamente</SelectItem>
              <SelectItem value="after_timeout">Retomar após período sem interação humana</SelectItem>
              <SelectItem value="manual">Retomar apenas com "Devolver para IA"</SelectItem>
              <SelectItem value="on_stage">Retomar ao mover para etapa específica</SelectItem>
              <SelectItem value="on_tag">Retomar quando tag específica for aplicada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {settings.resume_ai_mode === "after_timeout" && (
          <div>
            <Label className="text-xs">Tempo sem interação humana (minutos)</Label>
            <Input type="number" min={1} value={settings.resume_ai_after_minutes ?? 30}
              onChange={(e) => patch({ resume_ai_after_minutes: parseInt(e.target.value) || 30 })} className="mt-1.5 w-40" />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border p-4 space-y-2">
        <Label className="text-sm font-medium">Frases que indicam solicitação de atendimento humano</Label>
        <p className="text-xs text-muted-foreground">Uma frase por linha. Quando o cliente enviar uma delas, o agente inicia a transferência.</p>
        <Textarea
          value={(settings.transfer_intent_phrases ?? []).join("\n")}
          onChange={(e) => patch({ transfer_intent_phrases: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          rows={6}
          className="font-mono text-sm"
        />
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
