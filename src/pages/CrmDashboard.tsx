import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  LayoutGrid,
  Kanban,
  CalendarDays,
  Pencil,
  ChevronDown,
  Check,
  Star,
  Search,
  UserPlus,
  Clock,
  UserX,
  UserCheck,
  Percent,
  Timer,
  Snowflake,
  Sun,
  Flame,
  Zap,
  ExternalLink,
  Target,
  ShoppingCart,
  Trophy,
  Info,
  TrendingDown,
  Inbox,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

// ---------- Helpers ----------
const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type PeriodKey = "current" | "last" | "60d" | "90d" | "custom";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  current: "Mês atual",
  last: "Mês passado",
  "60d": "Últimos 60 dias",
  "90d": "Últimos 90 dias",
  custom: "Personalizado",
};

function getPeriodRange(p: PeriodKey): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === "last") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { start, end: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  if (p === "60d") {
    start = new Date(now);
    start.setDate(start.getDate() - 60);
    return { start, end: now };
  }
  if (p === "90d") {
    start = new Date(now);
    start.setDate(start.getDate() - 90);
    return { start, end: now };
  }
  return { start, end };
}

interface LeadRow {
  id: string;
  created_at: string;
  updated_at: string;
  lead_status: string;
  value_ps: number;
  value_mrr: number;
  lost_reason: string | null;
  source: string | null;
  stage: string;
  workspace_id: string | null;
}

// ---------- Dropdowns ----------
function PainelDropdown() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const painels = [{ id: "1", name: "Time Comercial", favorite: true }];
  const active = painels[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LayoutGrid className="h-4 w-4" />
          <span>{active.name}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Selecionar painel"
            className="pl-7 h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          {painels
            .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
            .map((p) => (
              <button
                key={p.id}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted text-sm"
              >
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>{p.name}</span>
                </div>
                <Star
                  className={cn(
                    "h-4 w-4",
                    p.favorite
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function KanbansDropdown({
  workspaces,
  selectedIds,
  onChange,
}: {
  workspaces: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((s) => s !== id));
    else onChange([...selectedIds, id]);
  };

  const label =
    selectedIds.length === 0
      ? "Todos os kanbans"
      : selectedIds.length === 1
        ? workspaces.find((w) => w.id === selectedIds[0])?.name || "1 kanban"
        : `${selectedIds.length} kanbans`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Kanban className="h-4 w-4" />
          <span>{label}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar kanbans..."
            className="pl-7 h-8 text-sm"
          />
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          <button
            onClick={() => onChange([])}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm"
          >
            <Check
              className={cn(
                "h-4 w-4",
                selectedIds.length === 0 ? "text-primary" : "opacity-0"
              )}
            />
            <span>Todos os kanbans</span>
          </button>
          {workspaces
            .filter((w) => w.name.toLowerCase().includes(q.toLowerCase()))
            .map((w) => (
              <button
                key={w.id}
                onClick={() => toggle(w.id)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted text-sm"
              >
                <div className="flex items-center gap-2">
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedIds.includes(w.id) ? "text-primary" : "opacity-0"
                    )}
                  />
                  <span>{w.name}</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  Vendas
                </Badge>
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PeriodDropdown({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (v: PeriodKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const options: PeriodKey[] = ["current", "last", "60d", "90d", "custom"];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          <span>{PERIOD_LABELS[value]}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              onChange(opt);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm"
          >
            <Check
              className={cn(
                "h-4 w-4",
                value === opt ? "text-primary" : "opacity-0"
              )}
            />
            <span>{PERIOD_LABELS[opt]}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ---------- KPI Card ----------
function KpiCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string | number;
  icon: any;
  iconClass: string;
}) {
  return (
    <Card className="min-w-[180px] p-4 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          {label}
        </span>
        <Icon className={cn("h-4 w-4", iconClass)} />
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </Card>
  );
}

// ---------- Temperatura card ----------
function TempCard({
  name,
  icon: Icon,
  bg,
  pctClass,
  ps,
  mrr,
  pct,
  leads,
}: {
  name: string;
  icon: any;
  bg: string;
  pctClass: string;
  ps: number;
  mrr: number;
  pct: number;
  leads: number;
}) {
  return (
    <Card className={cn("p-4 border", bg)}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-sm">{name}</span>
        <Icon className={cn("h-4 w-4", pctClass)} />
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">P&S</span>
          <span className="flex items-center gap-1 font-medium">
            {formatBRL(ps)}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">MRR</span>
          <span className="flex items-center gap-1 font-medium">
            {formatBRL(mrr)}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </span>
        </div>
      </div>
      <Separator className="my-2" />
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-semibold", pctClass)}>
          {pct.toFixed(1)}%
        </span>
        <span className="text-muted-foreground">{leads} leads</span>
      </div>
    </Card>
  );
}

// ---------- Main Page ----------
export default function CrmDashboard() {
  const companyId = useActiveCompanyId();
  const { workspaces } = useWorkspaces();

  const [period, setPeriod] = useState<PeriodKey>("current");
  const [selectedKanbans, setSelectedKanbans] = useState<string[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => getPeriodRange(period), [period]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("crm_leads")
        .select(
          "id,created_at,updated_at,lead_status,value_ps,value_mrr,lost_reason,source,stage,workspace_id"
        )
        .eq("servidor_id", companyId)
        .gte("created_at", range.start.toISOString())
        .lte("created_at", range.end.toISOString());

      if (selectedKanbans.length > 0) {
        q = q.in("workspace_id", selectedKanbans);
      }

      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error("[CrmDashboard] erro ao buscar leads:", error);
        setLeads([]);
      } else {
        setLeads((data as LeadRow[]) || []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, range.start, range.end, selectedKanbans]);

  // ---------- Métricas ----------
  const metrics = useMemo(() => {
    const entrantes = leads.length;
    const ganhos = leads.filter((l) => l.lead_status === "won").length;
    const perdidos = leads.filter((l) => l.lead_status === "lost").length;
    const abertos = leads.filter(
      (l) => l.lead_status !== "won" && l.lead_status !== "lost"
    ).length;
    const conversao = entrantes > 0 ? (ganhos / entrantes) * 100 : 0;

    const wonLeads = leads.filter((l) => l.lead_status === "won");
    const totalDays = wonLeads.reduce((acc, l) => {
      const d =
        (new Date(l.updated_at).getTime() -
          new Date(l.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      return acc + Math.max(0, d);
    }, 0);
    const leadTime =
      wonLeads.length > 0 ? Math.round(totalDays / wonLeads.length) : 0;

    return { entrantes, ganhos, perdidos, abertos, conversao, leadTime };
  }, [leads]);

  // Potencial de ganho - temperatura por dias parados / estágios
  const potencial = useMemo(() => {
    const open = leads.filter(
      (l) => l.lead_status !== "won" && l.lead_status !== "lost"
    );
    const totalPS = open.reduce((s, l) => s + Number(l.value_ps || 0), 0);
    const totalMRR = open.reduce((s, l) => s + Number(l.value_mrr || 0), 0);

    const now = Date.now();
    const groups = { frio: [], morno: [], quente: [], muito: [] } as Record<
      string,
      LeadRow[]
    >;
    open.forEach((l) => {
      const days =
        (now - new Date(l.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 30) groups.frio.push(l);
      else if (days > 14) groups.morno.push(l);
      else if (days > 7) groups.quente.push(l);
      else groups.muito.push(l);
    });

    const buildTemp = (rows: LeadRow[]) => ({
      ps: rows.reduce((s, l) => s + Number(l.value_ps || 0), 0),
      mrr: rows.reduce((s, l) => s + Number(l.value_mrr || 0), 0),
      leads: rows.length,
      pct: open.length > 0 ? (rows.length / open.length) * 100 : 0,
    });

    return {
      totalPS,
      totalMRR,
      frio: buildTemp(groups.frio),
      morno: buildTemp(groups.morno),
      quente: buildTemp(groups.quente),
      muito: buildTemp(groups.muito),
    };
  }, [leads]);

  // Comissões / Vendas realizadas
  const vendas = useMemo(() => {
    const won = leads.filter((l) => l.lead_status === "won");
    return {
      psCount: won.length,
      psValue: won.reduce((s, l) => s + Number(l.value_ps || 0), 0),
      mrrCount: won.filter((l) => Number(l.value_mrr) > 0).length,
      mrrValue: won.reduce((s, l) => s + Number(l.value_mrr || 0), 0),
    };
  }, [leads]);

  // Taxa de conversão por mês (últimos 6 meses)
  const conversionByMonth = useMemo(() => {
    const months: { label: string; pct: number; open: boolean }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLeads = leads.filter((l) => {
        const c = new Date(l.created_at);
        return c >= d && c < end;
      });
      const won = monthLeads.filter((l) => l.lead_status === "won").length;
      const closed = monthLeads.filter(
        (l) => l.lead_status === "won" || l.lead_status === "lost"
      ).length;
      const stillOpen = monthLeads.length > 0 && closed === 0;
      const pct = monthLeads.length > 0 ? (won / monthLeads.length) * 100 : 0;
      months.push({
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") +
          "/" +
          String(d.getFullYear()).slice(2),
        pct,
        open: stillOpen,
      });
    }
    return months;
  }, [leads]);

  const colorForPct = (m: { pct: number; open: boolean }) => {
    if (m.open) return "#eab308"; // yellow
    if (m.pct <= 8) return "#ef4444"; // red
    if (m.pct <= 15) return "#3b82f6"; // blue
    return "#22c55e"; // green
  };

  // Motivos de perda
  const lossReasons = useMemo(() => {
    const lost = leads.filter((l) => l.lead_status === "lost");
    const counts = new Map<string, number>();
    lost.forEach((l) => {
      const r = (l.lost_reason || "SEM MOTIVO").toUpperCase();
      counts.set(r, (counts.get(r) || 0) + 1);
    });
    const arr = Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        pct: lost.length > 0 ? (count / lost.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { items: arr, total: lost.length };
  }, [leads]);

  // Origens
  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    leads.forEach((l) => {
      const s = l.source || "Outros";
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        pct: leads.length > 0 ? (count / leads.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [leads]);

  const reasonColor = (idx: number) => {
    return [
      "bg-red-500",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500",
    ][idx] || "bg-gray-400";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b">
        <PainelDropdown />
        <KanbansDropdown
          workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
          selectedIds={selectedKanbans}
          onChange={setSelectedKanbans}
        />
        <PeriodDropdown value={period} onChange={setPeriod} />
        <div className="ml-auto">
          <Button variant="outline" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* SEÇÃO 1 */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Métricas de Leads CRM</h2>
          <p className="text-sm text-muted-foreground">
            Visão geral dos leads com indicadores principais (ações no período)
          </p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <KpiCard
            label="Entrantes"
            value={metrics.entrantes}
            icon={UserPlus}
            iconClass="text-blue-500"
          />
          <KpiCard
            label="Em Aberto"
            value={metrics.abertos}
            icon={Clock}
            iconClass="text-amber-500"
          />
          <KpiCard
            label="Perdidos"
            value={metrics.perdidos}
            icon={UserX}
            iconClass="text-red-500"
          />
          <KpiCard
            label="Ganhos"
            value={metrics.ganhos}
            icon={UserCheck}
            iconClass="text-emerald-500"
          />
          <KpiCard
            label="Taxa de Conversão"
            value={`${metrics.conversao.toFixed(1).replace(".", ",")}%`}
            icon={Percent}
            iconClass="text-purple-500"
          />
          <KpiCard
            label="Lead Time"
            value={`${metrics.leadTime} dias`}
            icon={Timer}
            iconClass="text-orange-500"
          />
        </div>
      </section>

      {/* SEÇÃO 2 */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Potencial de Ganho</h2>
          <p className="text-sm text-muted-foreground">
            Valores totais de P&S e MRR agrupados por posição no funil de vendas
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Card className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">TOTAL P&S</div>
              <div className="text-2xl font-bold">
                {formatBRL(potencial.totalPS)}
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
          </Card>
          <Card className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">TOTAL MRR</div>
              <div className="text-2xl font-bold">
                {formatBRL(potencial.totalMRR)}
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
          </Card>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <TempCard
            name="Frio"
            icon={Snowflake}
            bg="bg-blue-50 dark:bg-blue-950/30 border-blue-200/50"
            pctClass="text-blue-600"
            {...potencial.frio}
          />
          <TempCard
            name="Morno"
            icon={Sun}
            bg="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200/50"
            pctClass="text-yellow-600"
            {...potencial.morno}
          />
          <TempCard
            name="Quente"
            icon={Flame}
            bg="bg-orange-50 dark:bg-orange-950/30 border-orange-200/50"
            pctClass="text-orange-600"
            {...potencial.quente}
          />
          <TempCard
            name="Muito Quente"
            icon={Zap}
            bg="bg-red-50 dark:bg-red-950/30 border-red-200/50"
            pctClass="text-red-600"
            {...potencial.muito}
          />
        </div>
      </section>

      {/* SEÇÃO 3 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Comissões e Metas */}
        <Card className="p-5">
          <div className="mb-3">
            <h3 className="text-base font-semibold">Comissões e Metas</h3>
            <p className="text-xs text-muted-foreground">
              Meta de venda, vendas realizadas e comissão conquistada
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium">Meta de Venda</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                Sem gestão de metas configurada
              </div>
            </Card>
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium">Vendas Realizadas</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">P&S</div>
                  <div className="font-semibold">{vendas.psCount} vendas</div>
                  <div className="text-[11px]">{formatBRL(vendas.psValue)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">MRR</div>
                  <div className="font-semibold">{vendas.mrrCount} vendas</div>
                  <div className="text-[11px]">{formatBRL(vendas.mrrValue)}</div>
                </div>
              </div>
            </Card>
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium">Comissão Conquistada</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                Requer gestão de metas
              </div>
            </Card>
          </div>
        </Card>

        {/* Taxa de Conversão Real */}
        <Card className="p-5">
          <div className="mb-3">
            <h3 className="text-base font-semibold">Taxa de Conversão Real</h3>
            <p className="text-xs text-muted-foreground">
              Análise de conversão por coorte de entrada dos leads
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] mb-2">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-yellow-500" /> Em aberto
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-red-500" /> 0–8%
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-blue-500" /> 8,1–15%
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-green-500" /> &gt;15%
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionByMonth}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, "Conversão"]}
                />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {conversionByMonth.map((m, i) => (
                    <Cell key={i} fill={colorForPct(m)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* SEÇÃO 4 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Motivos de Perda */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Motivos de Perda</h3>
            <p className="text-xs text-muted-foreground">
              Top 5 motivos de perda de cards dos kanbans de vendas
            </p>
          </div>
          {lossReasons.items.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2 py-8 justify-center">
              <TrendingDown className="h-4 w-4" />
              Nenhum motivo de perda registrado no período
            </div>
          ) : (
            <div className="space-y-4">
              {lossReasons.items.map((r, i) => (
                <div key={r.name}>
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="text-sm">
                      <span className="font-bold uppercase">{r.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        | Motivo de perda
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {r.count} cards ({r.pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full", reasonColor(i))}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Origens de Cards */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Origens de Cards</h3>
            <p className="text-xs text-muted-foreground">
              De onde vêm os leads do período
            </p>
          </div>
          {sources.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2 py-8 justify-center">
              <Inbox className="h-4 w-4" />
              Sem dados no período
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((s, i) => (
                <div key={s.name}>
                  <div className="flex items-baseline justify-between mb-1 text-sm">
                    <span className="font-medium capitalize">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.count} ({s.pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {loading && (
        <div className="text-xs text-muted-foreground">Carregando dados…</div>
      )}
    </div>
  );
}
