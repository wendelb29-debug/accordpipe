import { useServiceSettings } from "./useServiceSettings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface PillOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

function PillRadio<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: PillOption<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all",
              active
                ? "border-primary bg-primary/5 text-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                active ? "border-primary" : "border-muted-foreground/40",
              )}
            >
              {active && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span className="flex-1 font-medium">{opt.label}</span>
            {opt.hint && <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

export function DistribuicaoPanel() {
  const { settings, loading, saving, save, update } = useServiceSettings();
  if (loading || !settings)
    return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  // derive on/off toggles from numeric limits (0 or negative = unlimited/off)
  const receptiveOn = (settings.max_receptive_per_agent ?? 0) > 0;
  const activeOn = (settings.max_active_per_agent ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Grid: modo, tipo, tickets, último atendente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Modo de entrega
          </Label>
          <PillRadio
            value={settings.delivery_mode}
            onChange={(v) => update("delivery_mode", v)}
            options={[
              { value: "auto_accept", label: "Forçar aceitação automática", hint: "on" },
              { value: "accept_or_reject", label: "Permitir aceite/recusa", hint: "on" },
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Tipo de distribuição
          </Label>
          <PillRadio
            value={settings.distribution_type}
            onChange={(v) => update("distribution_type", v)}
            options={[
              { value: "round_robin", label: "Circular", hint: "on" },
              { value: "equal", label: "Igualitária", hint: "on" },
              { value: "availability", label: "Por disponibilidade", hint: "on" },
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Tickets por ciclo de distribuição
          </Label>
          <Input
            type="number"
            min={1}
            value={settings.tickets_per_cycle}
            onChange={(e) => update("tickets_per_cycle", parseInt(e.target.value) || 1)}
            className="h-11 rounded-xl"
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Máximo de tickets que um agente pode receber a cada ciclo de distribuição. Evita
            sobrecarga quando há muitos tickets acumulados no departamento.
          </p>
        </div>
      </div>

      {/* Limitar receptivos / ativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-sm text-foreground">Limitar atendimentos receptivos</div>
              <p className="text-xs text-muted-foreground mt-1">
                Número máximo de atendimentos receptivos distribuídos automaticamente por agente.
              </p>
            </div>
            <Switch
              checked={receptiveOn}
              onCheckedChange={(v) =>
                update("max_receptive_per_agent", v ? Math.max(1, settings.max_receptive_per_agent || 20) : 0)
              }
            />
          </div>
          {receptiveOn && (
            <div className="mt-4">
              <Label className="text-xs">
                Máximo por agente <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={settings.max_receptive_per_agent}
                onChange={(e) => update("max_receptive_per_agent", parseInt(e.target.value) || 1)}
                className="h-11 rounded-xl mt-1"
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-sm text-foreground">Limitar atendimentos ativos</div>
              <p className="text-xs text-muted-foreground mt-1">
                Número máximo de atendimentos ativos (iniciados pelo agente) por agente.
              </p>
            </div>
            <Switch
              checked={activeOn}
              onCheckedChange={(v) =>
                update("max_active_per_agent", v ? Math.max(1, settings.max_active_per_agent || 20) : 0)
              }
            />
          </div>
          {activeOn && (
            <div className="mt-4">
              <Label className="text-xs">
                Máximo por agente <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={settings.max_active_per_agent}
                onChange={(e) => update("max_active_per_agent", parseInt(e.target.value) || 1)}
                className="h-11 rounded-xl mt-1"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save(settings)} disabled={saving} className="rounded-xl">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Salvar
        </Button>
      </div>
    </div>
  );
}
