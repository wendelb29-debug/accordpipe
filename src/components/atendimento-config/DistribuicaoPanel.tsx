import { useServiceSettings } from "./useServiceSettings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function DistribuicaoPanel() {
  const { settings, loading, saving, save, update } = useServiceSettings();
  if (loading || !settings) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Modo de entrega</Label>
          <Select value={settings.delivery_mode} onValueChange={(v) => update("delivery_mode", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto_accept">Forçar aceitação automática</SelectItem>
              <SelectItem value="accept_or_reject">Permitir aceite ou recusa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo de distribuição</Label>
          <Select value={settings.distribution_type} onValueChange={(v) => update("distribution_type", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="round_robin">Circular (round-robin)</SelectItem>
              <SelectItem value="equal">Igualitária</SelectItem>
              <SelectItem value="availability">Por disponibilidade</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tickets por ciclo</Label>
          <Input type="number" min={1} value={settings.tickets_per_cycle} onChange={(e) => update("tickets_per_cycle", parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <Label>Máx. receptivos por agente</Label>
          <Input type="number" min={1} value={settings.max_receptive_per_agent} onChange={(e) => update("max_receptive_per_agent", parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <Label>Máx. ativos por agente</Label>
          <Input type="number" min={1} value={settings.max_active_per_agent} onChange={(e) => update("max_active_per_agent", parseInt(e.target.value) || 1)} />
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
