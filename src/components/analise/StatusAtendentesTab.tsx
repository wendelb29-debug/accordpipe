import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { Pencil, ArrowRightLeft, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OperatorRow {
  user_id: string;
  status: string;
  last_changed_at: string;
  profile?: { full_name?: string | null; avatar_url?: string | null; email?: string | null } | null;
}

interface EventRow {
  id: string;
  user_id: string;
  event_type: string;
  reason: string | null;
  duration_seconds: number | null;
  delay_seconds: number | null;
  started_at: string;
  ended_at: string | null;
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  available: { label: "Online", color: "text-emerald-500", dot: "bg-emerald-500" },
  busy: { label: "Ocupado", color: "text-rose-500", dot: "bg-rose-500" },
  away: { label: "Em pausa", color: "text-amber-500", dot: "bg-amber-500" },
  unavailable: { label: "Offline", color: "text-muted-foreground", dot: "bg-muted-foreground" },
};

export function StatusAtendentesTab() {
  const tenantId = useActiveCompanyId();
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data: ops } = await supabase
        .from("operator_status")
        .select("user_id, status, last_changed_at")
        .eq("tenant_id", tenantId);
      const rows = (ops || []) as any[];
      const ids = rows.map((r) => r.user_id);
      let profiles: any[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .in("id", ids);
        profiles = data || [];
      }
      setOperators(rows.map((r) => ({
        ...r,
        profile: profiles.find((p) => p.id === r.user_id) || null,
      })));

      const { data: evs } = await supabase
        .from("operator_status_events" as any)
        .select("id, user_id, event_type, reason, duration_seconds, delay_seconds, started_at, ended_at")
        .eq("tenant_id", tenantId)
        .order("started_at", { ascending: false })
        .limit(50);
      setEvents((evs || []) as unknown as EventRow[]);
    })();
  }, [tenantId]);

  const kpis = useMemo(() => {
    const c = { available: 0, busy: 0, away: 0, unavailable: 0, delayed: 0 };
    for (const o of operators) {
      const s = o.status as keyof typeof c;
      if (s in c) (c as any)[s]++;
    }
    return c;
  }, [operators]);

  const activePauses = operators.filter((o) => o.status === "away");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Online" value={kpis.available} color="text-emerald-500" />
        <SummaryCard label="Ocupados" value={kpis.busy} color="text-rose-500" />
        <SummaryCard label="Em pausa" value={kpis.away} color="text-amber-500" />
        <SummaryCard label="Em atraso" value={kpis.delayed} color="text-orange-500" />
        <SummaryCard label="Offline" value={kpis.unavailable} color="text-muted-foreground" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Coffee className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Pausas ativas</h3>
        </div>
        {activePauses.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhuma pausa ativa no momento.</p>
        ) : (
          <ul className="space-y-2">
            {activePauses.map((p) => (
              <li key={p.user_id} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {p.profile?.full_name || p.profile?.email || p.user_id.slice(0, 8)}
                <span className="text-xs text-muted-foreground ml-auto">
                  há {formatDistanceToNowStrict(new Date(p.last_changed_at), { locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Select disabled>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
        </Select>
        <Select disabled>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Atendentes" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
        </Select>
        <Select disabled>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Departamentos" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
        </Select>
        <Select disabled>
          <SelectTrigger className="h-8 w-[110px] text-xs ml-auto"><SelectValue placeholder="Mostrar 25" /></SelectTrigger>
          <SelectContent><SelectItem value="25">25</SelectItem></SelectContent>
        </Select>
      </div>

      {/* Current state */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">Estado atual de cada atendente</div>
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground uppercase">
            <tr>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Atendente</th>
              <th className="text-left px-3 py-2">Tempo no status</th>
              <th className="text-left px-3 py-2">Motivo da pausa</th>
              <th className="text-left px-3 py-2">Departamentos</th>
              <th className="text-right px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {operators.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Nenhum atendente ativo.</td></tr>
            ) : operators.map((o) => {
              const meta = STATUS_META[o.status] || STATUS_META.unavailable;
              return (
                <tr key={o.user_id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Badge className={cn("border text-[10px]", meta.color, "bg-transparent border-current")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full mr-1", meta.dot)} />
                      {meta.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                        {(o.profile?.full_name || o.profile?.email || "?").slice(0, 2).toUpperCase()}
                      </span>
                      {o.profile?.full_name || o.profile?.email || o.user_id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDistanceToNowStrict(new Date(o.last_changed_at), { locale: ptBR })}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">—</td>
                  <td className="px-3 py-2 text-muted-foreground">—</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar status">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Transferir atendimentos">
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">Histórico de eventos</div>
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground uppercase">
            <tr>
              <th className="text-left px-3 py-2">Atendente</th>
              <th className="text-left px-3 py-2">Evento</th>
              <th className="text-left px-3 py-2">Motivo</th>
              <th className="text-left px-3 py-2">Duração</th>
              <th className="text-left px-3 py-2">Atraso</th>
              <th className="text-left px-3 py-2">Início</th>
              <th className="text-left px-3 py-2">Fim</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                Nenhum evento registrado ainda.
              </td></tr>
            ) : events.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-3 py-2">{e.user_id.slice(0, 8)}</td>
                <td className="px-3 py-2">
                  <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30 border">{e.event_type}</Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{e.reason || "—"}</td>
                <td className="px-3 py-2 tabular-nums">{formatSec(e.duration_seconds)}</td>
                <td className="px-3 py-2 tabular-nums">{formatSec(e.delay_seconds)}</td>
                <td className="px-3 py-2 text-muted-foreground">{format(new Date(e.started_at), "dd/MM HH:mm")}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {e.ended_at ? format(new Date(e.ended_at), "dd/MM HH:mm") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className={cn("text-2xl font-semibold tabular-nums mt-1", color)}>{value}</div>
    </div>
  );
}

function formatSec(s: number | null) {
  if (!s && s !== 0) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
