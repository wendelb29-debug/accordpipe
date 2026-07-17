import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { RefreshCw, Maximize2, Circle, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Dept {
  id: string;
  name: string;
  business_hours?: string;
}

interface DeptStats {
  waiting: number;
  oldestWaitStart: string | null;
  online: number;
  busy: number;
  paused: number;
  offline: number;
  outsideHours: boolean;
}

export function MonitoramentoTab() {
  const tenantId = useActiveCompanyId();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [stats, setStats] = useState<Record<string, DeptStats>>({});
  const [refreshInterval, setRefreshInterval] = useState<number>(300);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await supabase
        .from("tenant_departments" as any)
        .select("id, name")
        .eq("tenant_id", tenantId);
      setDepts((data || []) as unknown as Dept[]);

      // Mock stats per dept (real aggregation TBD)
      const map: Record<string, DeptStats> = {};
      for (const d of (data || []) as any[]) {
        map[d.id] = {
          waiting: 0,
          oldestWaitStart: null,
          online: 0, busy: 0, paused: 0, offline: 0,
          outsideHours: false,
        };
      }
      setStats(map);
      setLastRefresh(new Date());
    })();
  }, [tenantId, tick]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const t = setInterval(() => setTick((v) => v + 1), refreshInterval * 1000);
    return () => clearInterval(t);
  }, [refreshInterval]);

  return (
    <div className="space-y-5">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Select disabled>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Departamentos" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
        </Select>
        <Select value={String(refreshInterval)} onValueChange={(v) => setRefreshInterval(Number(v))}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="60">1 minuto</SelectItem>
            <SelectItem value="300">5 minutos</SelectItem>
            <SelectItem value="600">10 minutos</SelectItem>
            <SelectItem value="0">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTick((v) => v + 1)}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" title="Tela cheia" disabled>
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        <div className="ml-auto flex items-center gap-1.5 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-muted-foreground">
            Ao vivo · atualizado {formatDistanceToNowStrict(lastRefresh, { locale: ptBR, addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Hoje - dept cards */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Hoje</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {depts.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum departamento cadastrado.
            </div>
          )}
          {depts.map((d) => {
            const s = stats[d.id] || {
              waiting: 0, oldestWaitStart: null,
              online: 0, busy: 0, paused: 0, offline: 0, outsideHours: false,
            };
            const alert = s.waiting > 0 || s.online === 0;
            return (
              <div key={d.id} className={cn(
                "rounded-2xl border p-4 space-y-3",
                alert ? "border-rose-500/40 bg-rose-500/5" : "border-border bg-card",
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm">{d.name}</div>
                  {s.outsideHours ? (
                    <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 border text-[10px]">
                      FORA DO HORÁRIO
                    </Badge>
                  ) : s.online === 0 ? (
                    <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30 border text-[10px]">
                      NENHUM ATENDENTE ONLINE
                    </Badge>
                  ) : null}
                </div>
                <div>
                  <div className="text-2xl font-semibold text-rose-500 tabular-nums">{s.waiting}</div>
                  <div className="text-xs text-muted-foreground">
                    aguardando atendimento
                    {s.oldestWaitStart && (
                      <> · mais antigo há {formatDistanceToNowStrict(new Date(s.oldestWaitStart), { locale: ptBR })}</>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  <MiniStatus color="bg-emerald-500" label="Online" value={s.online} />
                  <MiniStatus color="bg-rose-500" label="Ocupado" value={s.busy} />
                  <MiniStatus color="bg-amber-500" label="Pausa" value={s.paused} />
                  <MiniStatus color="bg-muted-foreground" label="Offline" value={s.offline} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <SummaryBadge label="Aguardando atendimento" value="—" tone="orange" />
        <SummaryBadge label="Em atendimento" value="—" tone="primary" />
        <SummaryBadge label="Em espera" value="—" tone="amber" />
        <SummaryBadge label="Finalizados hoje" value="—" tone="emerald" />
      </div>

      {/* Tempos médios */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Tempos médios de hoje</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["Tempo de espera", "Até 1ª resposta", "Em espera", "Atendimento humano"].map((l) => (
            <div key={l} className="rounded-xl border border-border bg-background p-3">
              <div className="text-[10px] uppercase text-muted-foreground">{l}</div>
              <div className="text-lg font-semibold tabular-nums">00:00:00</div>
              <div className="text-[10px] text-muted-foreground">em horário comercial</div>
            </div>
          ))}
        </div>
      </div>

      {/* Aguardando table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
          <div className="text-sm font-semibold">Aguardando atendimento</div>
          <div className="relative ml-auto min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Cliente ou protocolo" className="pl-9 h-8 text-xs" />
          </div>
          <Select disabled>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Departamentos" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
          </Select>
          <Select disabled>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Mais antigos" /></SelectTrigger>
            <SelectContent><SelectItem value="oldest">Mais antigos</SelectItem></SelectContent>
          </Select>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground uppercase">
            <tr>
              <th className="text-left px-3 py-2">Tempo de espera</th>
              <th className="text-left px-3 py-2">Protocolo</th>
              <th className="text-left px-3 py-2">Cliente</th>
              <th className="text-left px-3 py-2">Departamento</th>
              <th className="text-left px-3 py-2">Disp. do depto</th>
              <th className="text-left px-3 py-2">Tentativas</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
              Nenhum atendimento aguardando no momento.
            </td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniStatus({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-1">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-semibold">{value}</span>
    </div>
  );
}

function SummaryBadge({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  const toneCls = ({
    primary: "text-primary",
    orange: "text-orange-500",
    amber: "text-amber-500",
    emerald: "text-emerald-500",
  } as any)[tone] || "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-lg font-semibold tabular-nums", toneCls)}>{value}</span>
    </div>
  );
}
