import { TrendingUp, TrendingDown, Target, Award, Percent, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIProps {
  totalMeta: number;
  totalRealizado: number;
  percentualGeral: number;
  totalGanhos: number;
  totalPerdas: number;
  conversaoMedia: number;
}

export function PerformanceKPIs({ totalMeta, totalRealizado, percentualGeral, totalGanhos, totalPerdas, conversaoMedia }: KPIProps) {
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
