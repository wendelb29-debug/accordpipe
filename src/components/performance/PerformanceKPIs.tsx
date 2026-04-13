import { TrendingUp, TrendingDown, Target, Award, Percent, BarChart3, Activity, Clock, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceKPI, PerformanceSnapshot } from "@/hooks/usePerformanceData";

interface KPIProps {
  totalMeta: number;
  totalRealizado: number;
  percentualGeral: number;
  totalGanhos: number;
  totalPerdas: number;
  conversaoMedia: number;
  workspaceKpis?: WorkspaceKPI[];
  snapshots?: PerformanceSnapshot[];
}

function getKpiIcon(tipo: string) {
  switch (tipo) {
    case "valor": return Award;
    case "percentual": return Percent;
    case "tempo": return Clock;
    case "quantidade": return Hash;
    default: return Activity;
  }
}

function computeKpiValue(kpi: WorkspaceKPI, snapshots: PerformanceSnapshot[]): { value: string; raw: number } {
  // Aggregate kpi_data from snapshots for this KPI
  const kpiId = kpi.id;
  let total = 0;
  let count = 0;
  snapshots.forEach((s) => {
    const data = s.kpi_data as Record<string, any> | undefined;
    if (data && data[kpiId] !== undefined) {
      total += Number(data[kpiId]) || 0;
      count++;
    }
  });

  // Fallback: use standard fields based on origem
  if (count === 0) {
    switch (kpi.origem) {
      case "crm":
        total = snapshots.reduce((sum, s) => sum + s.valor_total, 0);
        break;
      case "tarefas":
        total = snapshots.reduce((sum, s) => sum + s.tarefas_concluidas, 0);
        break;
      default:
        total = 0;
    }
  }

  // Format by tipo
  switch (kpi.tipo) {
    case "valor":
      return {
        value: total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        raw: total,
      };
    case "percentual":
      return { value: `${Math.round(total)}%`, raw: total };
    case "tempo":
      return { value: `${Math.round(total)}h`, raw: total };
    default:
      return { value: String(Math.round(total)), raw: total };
  }
}

export function PerformanceKPIs({
  totalMeta, totalRealizado, percentualGeral, totalGanhos, totalPerdas, conversaoMedia,
  workspaceKpis, snapshots,
}: KPIProps) {
  // If workspace has custom KPIs, show them instead
  if (workspaceKpis && workspaceKpis.length > 0 && snapshots) {
    const dynamicCards = workspaceKpis.map((kpi) => {
      const Icon = getKpiIcon(kpi.tipo);
      const { value, raw } = computeKpiValue(kpi, snapshots);
      return {
        label: kpi.nome,
        value,
        icon: Icon,
        color: "text-primary",
        bgColor: "bg-primary/10",
      };
    });

    // Always add standard summary cards at the end
    dynamicCards.push(
      {
        label: "Conversão",
        value: `${conversaoMedia}%`,
        icon: BarChart3,
        color: "text-violet-400",
        bgColor: "bg-violet-500/10",
      },
      {
        label: "Ganhos / Perdas",
        value: `${totalGanhos} / ${totalPerdas}`,
        icon: BarChart3,
        color: "text-cyan-400",
        bgColor: "bg-cyan-500/10",
      },
    );

    return <KPIGrid cards={dynamicCards} />;
  }

  // Default: standard sales KPIs
  const trending = percentualGeral >= 100;
  const cards = [
    {
      label: "Meta do Mês",
      value: totalMeta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      icon: Target,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Realizado",
      value: totalRealizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      icon: Award,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "% Atingido",
      value: `${percentualGeral}%`,
      icon: Percent,
      color: percentualGeral >= 100 ? "text-emerald-400" : percentualGeral >= 70 ? "text-amber-400" : "text-red-400",
      bgColor: percentualGeral >= 100 ? "bg-emerald-500/10" : percentualGeral >= 70 ? "bg-amber-500/10" : "bg-red-500/10",
    },
    {
      label: "Conversão Média",
      value: `${conversaoMedia}%`,
      icon: BarChart3,
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
    },
    {
      label: "Tendência",
      value: trending ? "Acima" : "Abaixo",
      icon: trending ? TrendingUp : TrendingDown,
      color: trending ? "text-emerald-400" : "text-red-400",
      bgColor: trending ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Ganhos / Perdas",
      value: `${totalGanhos} / ${totalPerdas}`,
      icon: BarChart3,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
  ];

  return <KPIGrid cards={cards} />;
}

function KPIGrid({ cards }: { cards: { label: string; value: string; icon: any; color: string; bgColor: string }[] }) {
  const cols = cards.length <= 4 ? "lg:grid-cols-4" : cards.length <= 6 ? "lg:grid-cols-6" : "lg:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-3", cols)}>
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", card.bgColor)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
          <p className={cn("text-xl font-bold mt-1", card.color)}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
