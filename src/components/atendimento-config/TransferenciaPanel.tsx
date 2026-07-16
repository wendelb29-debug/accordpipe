import { useServiceSettings, ServiceSettings } from "./useServiceSettings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const TOGGLES: Array<{ key: keyof ServiceSettings; label: string; desc: string }> = [
  { key: "keep_history_on_transfer", label: "Manter histórico na transferência", desc: "O próximo atendente recebe a conversa anterior" },
  { key: "require_transfer_note", label: "Exigir observação em transferências", desc: "Bloqueia transferência sem justificativa" },
  { key: "move_to_wait_on_transfer", label: "Mover para espera ao transferir", desc: "Envia o cliente para a fila até o novo atendente aceitar" },
  { key: "block_transfer_to_offline", label: "Bloquear transferência para agentes offline", desc: "Evita direcionar para quem não está disponível" },
];

export function TransferenciaPanel() {
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
