import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import {
  Trash2,
  TrendingUp,
  Calendar as CalendarIcon,
  AlertTriangle,
  Download,
  Loader2,
  Target,
  Users,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const LOST_REASONS_MAP: Record<string, string> = {
  "DADOS INCORRETOS": "Dados Incorretos",
  DESISTIU: "Desistiu",
  "PAROU DE RESPONDER": "Parou de Responder",
  "PREÇO CONTRATO": "Preço Contrato",
  "SEM CONTATO": "Sem Contato",
};

const REASON_COLORS: Record<string, string> = {
  "DADOS INCORRETOS": "#f59e0b",
  DESISTIU: "#ef4444",
  "PAROU DE RESPONDER": "#8b5cf6",
  "PREÇO CONTRATO": "#06b6d4",
  "SEM CONTATO": "#ec4899",
};

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "365", label: "Este ano" },
  { value: "all", label: "Todo o período" },
];

const monthLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");

const normalizeReason = (raw?: string | null) => {
  if (!raw) return "Não informado";
  const key = raw.split(":")[0]?.trim().toUpperCase();
  return LOST_REASONS_MAP[key] ? key : key || "Não informado";
};

export default function DescarteAnalytics() {
  const [loading, setLoading] = useState(true);
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [totalPipeline, setTotalPipeline] = useState(0);
  const [period, setPeriod] = useState("30");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: lost }, { count }] = await Promise.all([
        supabase
          .from("crm_leads")
          .select("id, lost_reason, updated_at, created_at, created_by_user_id, created_by_name, value_mrr")
          .eq("lead_status", "lost")
          .order("updated_at", { ascending: false }),
        supabase.from("crm_leads").select("*", { count: "exact", head: true }),
      ]);
      setAllLeads(lost || []);
      setTotalPipeline(count || 0);
      setLoading(false);
    })();
  }, []);

  const periodStart = useMemo(() => {
    if (period === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(period));
    return d;
  }, [period]);

  const filtered = useMemo(() => {
    return allLeads.filter((l) => {
      const date = new Date(l.updated_at);
      if (periodStart && date < periodStart) return false;
      if (sellerFilter !== "all" && l.created_by_user_id !== sellerFilter) return false;
      if (reasonFilter !== "all" && normalizeReason(l.lost_reason) !== reasonFilter) return false;
      return true;
    });
  }, [allLeads, periodStart, sellerFilter, reasonFilter]);

  const sellers = useMemo(() => {
    const map = new Map<string, string>();
    allLeads.forEach((l) => {
      if (l.created_by_user_id) map.set(l.created_by_user_id, l.created_by_name || "Sem nome");
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allLeads]);

  // Reason ranking
  const reasonRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((l) => {
      const r = normalizeReason(l.lost_reason);
      counts[r] = (counts[r] || 0) + 1;
    });
    const total = filtered.length || 1;
    return Object.entries(counts)
      .map(([reason, count]) => ({
        reason,
        label: LOST_REASONS_MAP[reason] || reason,
        count,
        pct: (count / total) * 100,
        color: REASON_COLORS[reason] || "#64748b",
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Monthly evolution (last 6 months, all leads ignoring period filter)
  const monthlyEvolution = useMemo(() => {
    const months: { key: string; label: string; date: Date }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: monthLabel(d),
        date: d,
      });
    }
    const reasons = Object.keys(LOST_REASONS_MAP);
    return months.map((m) => {
      const row: any = { month: m.label };
      reasons.forEach((r) => (row[r] = 0));
      allLeads.forEach((l) => {
        if (sellerFilter !== "all" && l.created_by_user_id !== sellerFilter) return;
        const d = new Date(l.updated_at);
        if (d.getFullYear() === m.date.getFullYear() && d.getMonth() === m.date.getMonth()) {
          const r = normalizeReason(l.lost_reason);
          if (reasons.includes(r)) row[r] = (row[r] || 0) + 1;
        }
      });
      return row;
    });
  }, [allLeads, sellerFilter]);

  // Sellers ranking
  const sellersRanking = useMemo(() => {
    const map = new Map<string, { name: string; total: number; reasons: Record<string, number> }>();
    filtered.forEach((l) => {
      const id = l.created_by_user_id || "unknown";
      const name = l.created_by_name || "Sem vendedor";
      if (!map.has(id)) map.set(id, { name, total: 0, reasons: {} });
      const e = map.get(id)!;
      e.total++;
      const r = normalizeReason(l.lost_reason);
      e.reasons[r] = (e.reasons[r] || 0) + 1;
    });
    const total = filtered.length || 1;
    return Array.from(map.values())
      .map((s) => {
        const main = Object.entries(s.reasons).sort((a, b) => b[1] - a[1])[0];
        return {
          name: s.name,
          total: s.total,
          mainReason: main ? LOST_REASONS_MAP[main[0]] || main[0] : "—",
          mainReasonCount: main ? main[1] : 0,
          pct: (s.total / total) * 100,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Summary cards
  const summary = useMemo(() => {
    const total = filtered.length;
    const top = reasonRanking[0];
    const now = new Date();
    const thisMonth = allLeads.filter((l) => {
      const d = new Date(l.updated_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const dropRate = totalPipeline > 0 ? (allLeads.length / totalPipeline) * 100 : 0;
    return {
      total,
      topReason: top ? `${top.label} (${top.pct.toFixed(0)}%)` : "—",
      thisMonth,
      dropRate: dropRate.toFixed(1),
    };
  }, [filtered, reasonRanking, allLeads, totalPipeline]);

  // Auto insights
  const insights = useMemo(() => {
    const out: { icon: string; text: string; tone: "warn" | "info" | "danger" }[] = [];
    // Compare current period vs previous period (same length)
    if (periodStart) {
      const days = parseInt(period);
      const prevStart = new Date(periodStart);
      prevStart.setDate(prevStart.getDate() - days);
      const reasonsCurr: Record<string, number> = {};
      const reasonsPrev: Record<string, number> = {};
      allLeads.forEach((l) => {
        const d = new Date(l.updated_at);
        const r = normalizeReason(l.lost_reason);
        if (d >= periodStart) reasonsCurr[r] = (reasonsCurr[r] || 0) + 1;
        else if (d >= prevStart && d < periodStart) reasonsPrev[r] = (reasonsPrev[r] || 0) + 1;
      });
      Object.entries(reasonsCurr).forEach(([r, c]) => {
        const prev = reasonsPrev[r] || 0;
        if (prev === 0 && c >= 3) {
          out.push({
            icon: "📈",
            text: `'${LOST_REASONS_MAP[r] || r}' apareceu ${c}x no período atual e não havia no anterior`,
            tone: "warn",
          });
        } else if (prev > 0) {
          const variation = ((c - prev) / prev) * 100;
          if (Math.abs(variation) >= 20) {
            out.push({
              icon: variation > 0 ? "⚠️" : "✅",
              text: `'${LOST_REASONS_MAP[r] || r}' ${variation > 0 ? "cresceu" : "caiu"} ${Math.abs(variation).toFixed(0)}% comparado ao período anterior`,
              tone: variation > 0 ? "danger" : "info",
            });
          }
        }
      });
    }
    // Seller concentration
    sellersRanking.forEach((s) => {
      if (s.mainReasonCount > 0 && s.total >= 3) {
        const conc = (s.mainReasonCount / s.total) * 100;
        if (conc >= 60) {
          out.push({
            icon: "📌",
            text: `${s.name} concentra ${conc.toFixed(0)}% dos descartes em '${s.mainReason}'`,
            tone: "warn",
          });
        }
      }
    });
    // Top reason
    if (reasonRanking[0] && reasonRanking[0].pct >= 30) {
      out.push({
        icon: "🎯",
        text: `'${reasonRanking[0].label}' representa ${reasonRanking[0].pct.toFixed(0)}% de todos os descartes do período`,
        tone: "info",
      });
    }
    return out.slice(0, 4);
  }, [allLeads, periodStart, period, reasonRanking, sellersRanking]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        reasonRanking.map((r) => ({ Motivo: r.label, Quantidade: r.count, Percentual: `${r.pct.toFixed(1)}%` })),
      ),
      "Ranking de Motivos",
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyEvolution), "Evolução Mensal");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        sellersRanking.map((s) => ({
          Vendedor: s.name,
          Total: s.total,
          "Motivo Principal": s.mainReason,
          "% do Total": `${s.pct.toFixed(1)}%`,
        })),
      ),
      "Por Vendedor",
    );
    XLSX.writeFile(wb, `Analise_Descartes_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.xlsx`);
    toast.success("Análise exportada!");
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44 h-9 text-xs">
            <CalendarIcon className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sellerFilter} onValueChange={setSellerFilter}>
          <SelectTrigger className="w-48 h-9 text-xs">
            <Users className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todos vendedores</SelectItem>
            {sellers.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-48 h-9 text-xs">
            <Target className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Motivo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todos motivos</SelectItem>
            {Object.entries(LOST_REASONS_MAP).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportExcel}>
            <Download className="h-3.5 w-3.5" /> Exportar Análise
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-destructive/10">
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Total Descartado</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10">
              <Target className="h-4 w-4 text-purple-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase">Maior Motivo</p>
              <p className="text-sm font-bold truncate">{summary.topReason}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10">
              <CalendarIcon className="h-4 w-4 text-cyan-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Este Mês</p>
              <p className="text-2xl font-bold">{summary.thisMonth}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10">
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Taxa de Descarte</p>
              <p className="text-2xl font-bold">{summary.dropRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking horizontal bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" /> Ranking de Motivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reasonRanking.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sem dados no período</p>
          ) : (
            <div className="space-y-2">
              {reasonRanking.map((r) => (
                <div key={r.reason} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{r.label}</span>
                    <span className="text-muted-foreground">
                      {r.count} ({r.pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-6 rounded-md bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all"
                      style={{
                        width: `${r.pct}%`,
                        background: `linear-gradient(90deg, ${r.color}, #06b6d4)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evolution + Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-500" /> Evolução nos últimos 6 meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {Object.entries(LOST_REASONS_MAP).map(([k, v]) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    name={v}
                    stroke={REASON_COLORS[k]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-pink-500" /> Descartes por Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[260px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Vendedor</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs">Motivo Principal</TableHead>
                    <TableHead className="text-xs text-right">% Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellersRanking.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                        Sem dados
                      </TableCell>
                    </TableRow>
                  )}
                  {sellersRanking.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs text-right">{s.total}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {s.mainReason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right">{s.pct.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Principais Gaps Identificados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Sem variações relevantes detectadas no período.
            </p>
          ) : (
            <div className="space-y-2">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-3 rounded-md text-xs border ${
                    ins.tone === "danger"
                      ? "bg-destructive/5 border-destructive/30 text-destructive-foreground"
                      : ins.tone === "warn"
                        ? "bg-amber-500/5 border-amber-500/30"
                        : "bg-cyan-500/5 border-cyan-500/30"
                  }`}
                >
                  <span className="text-base">{ins.icon}</span>
                  <span className="flex-1">{ins.text}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
