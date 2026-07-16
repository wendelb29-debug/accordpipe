import { useServiceSettings, ServiceSettings } from "./useServiceSettings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const TOGGLES: Array<{ key: keyof ServiceSettings; label: string; desc: string }> = [
  { key: "show_agent_name", label: "Nome do atendente nas mensagens", desc: "Exibe quem está atendendo antes da mensagem" },
  { key: "allow_audio", label: "Áudio", desc: "Permite enviar/receber áudios" },
  { key: "allow_emoji", label: "Emojis", desc: "Habilita seletor de emojis no chat" },
  { key: "allow_stickers", label: "Figurinhas", desc: "Permite envio de figurinhas" },
  { key: "allow_files", label: "Envio de arquivos", desc: "Permite anexar documentos e imagens" },
  { key: "allow_export_pdf", label: "Exportar conversas em PDF", desc: "Habilita botão de exportação no atendimento" },
];

export function RecursosChatPanel() {
  const { settings, loading, saving, save, update } = useServiceSettings();
  if (loading || !settings) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {TOGGLES.map(t => (
          <div key={t.key as string} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="font-medium">{t.label}</Label>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <Switch checked={settings[t.key] as boolean} onCheckedChange={(v) => update(t.key, v as any)} />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={() => save(settings)} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Salvar
        </Button>
      </div>
    </div>
  );
}
