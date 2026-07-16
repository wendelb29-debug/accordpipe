import { useCommunicationSettings } from "@/hooks/useChatbotAutomation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, RotateCcw } from "lucide-react";

export function AutomacaoFormatacaoPanel() {
  const { settings, setSettings, loading, saving, dirty, save, discard } = useCommunicationSettings();

  if (loading) return <div className="py-8 flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…</div>;
  const s = settings;
  const patch = (p: Partial<typeof s>) => setSettings({ ...s, ...p });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <Label className="text-sm font-medium">Mostrar que o agente está digitando</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Exibe indicador de digitação compatível com o canal enquanto a resposta é gerada.</p>
        </div>
        <Switch checked={s.show_typing_indicator} onCheckedChange={(v) => patch({ show_typing_indicator: v })} />
      </div>

      <div className="rounded-xl border border-border p-4 grid gap-3 md:grid-cols-3">
        <div>
          <Label className="text-xs">Simulação de digitação</Label>
          <Select value={s.typing_simulation} onValueChange={(v: any) => patch({ typing_simulation: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem simulação</SelectItem>
              <SelectItem value="fixed">Tempo fixo</SelectItem>
              <SelectItem value="proportional">Proporcional ao texto</SelectItem>
              <SelectItem value="random">Aleatório no intervalo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tempo mínimo (ms)</Label>
          <Input type="number" min={0} value={s.typing_min_ms} onChange={(e) => patch({ typing_min_ms: parseInt(e.target.value) || 0 })} className="mt-1.5" />
        </div>
        <div>
          <Label className="text-xs">Tempo máximo (ms)</Label>
          <Input type="number" min={0} value={s.typing_max_ms} onChange={(e) => patch({ typing_max_ms: parseInt(e.target.value) || 0 })} className="mt-1.5" />
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Dividir respostas longas</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Quebra a mensagem em blocos menores, respeitando links, listas e valores.</p>
          </div>
          <Switch checked={s.split_long_messages} onCheckedChange={(v) => patch({ split_long_messages: v })} />
        </div>
        {s.split_long_messages && (
          <div className="grid gap-3 md:grid-cols-3 pt-3 border-t border-border/50">
            <div>
              <Label className="text-xs">Máx. caracteres por bloco</Label>
              <Input type="number" min={50} value={s.split_max_chars} onChange={(e) => patch({ split_max_chars: parseInt(e.target.value) || 50 })} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Intervalo entre blocos (ms)</Label>
              <Input type="number" min={0} value={s.split_interval_ms} onChange={(e) => patch({ split_interval_ms: parseInt(e.target.value) || 0 })} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Máx. blocos</Label>
              <Input type="number" min={1} max={10} value={s.split_max_blocks} onChange={(e) => patch({ split_max_blocks: parseInt(e.target.value) || 1 })} className="mt-1.5" />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border p-4 grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs">Política de emojis</Label>
          <Select value={s.emoji_policy} onValueChange={(v: any) => patch({ emoji_policy: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não utilizar</SelectItem>
              <SelectItem value="moderate">Moderadamente</SelectItem>
              <SelectItem value="contextual">Conforme o contexto</SelectItem>
              <SelectItem value="free">Livremente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Máx. emojis por mensagem</Label>
          <Input type="number" min={0} value={s.max_emojis_per_message} onChange={(e) => patch({ max_emojis_per_message: parseInt(e.target.value) || 0 })} className="mt-1.5" />
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <Label className="text-sm font-medium">Mídias</Label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={s.audio_transcribe_incoming} onCheckedChange={(v) => patch({ audio_transcribe_incoming: v })} />
            Transcrever áudios recebidos
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={s.audio_reply_enabled} onCheckedChange={(v) => patch({ audio_reply_enabled: v })} />
            Permitir responder em áudio
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={s.image_analysis_enabled} onCheckedChange={(v) => patch({ image_analysis_enabled: v })} />
            Analisar imagens
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={s.document_analysis_enabled} onCheckedChange={(v) => patch({ document_analysis_enabled: v })} />
            Analisar documentos e PDFs
          </label>
        </div>
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
