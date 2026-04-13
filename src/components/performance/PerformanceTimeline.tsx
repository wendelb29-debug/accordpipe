import { useState } from "react";
import type { PerformanceSnapshot } from "@/hooks/usePerformanceData";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  snapshots: PerformanceSnapshot[];
  onSelectSnapshot?: (snapshot: PerformanceSnapshot) => void;
}

function getInsight(snapshot: PerformanceSnapshot, prev?: PerformanceSnapshot): string {
  if (!prev) return "Primeiro registro do período";
  const diff = snapshot.score - prev.score;
  if (diff > 10) return "🚀 Evolução consistente";
  if (diff > 0) return "📈 Acima da meta projetada";
  if (diff > -10) return "⚠️ Necessita atenção";
  return "🔴 Queda de performance";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-500 shadow-emerald-500/50";
  if (score >= 60) return "bg-amber-500 shadow-amber-500/50";
  return "bg-red-500 shadow-red-500/50";
}

export function PerformanceTimeline({ snapshots, onSelectSnapshot }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const sorted = [...snapshots].sort((a, b) => a.data.localeCompare(b.data));

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
        <p className="text-muted-foreground text-sm">Nenhum snapshot disponível para o período selecionado.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Os dados são gerados automaticamente à medida que o CRM é utilizado.</p>
      </div>
    );
  }

  const maxScore = Math.max(...sorted.map(s => s.score), 100);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Timeline de Performance</h3>
      <div className="relative">
        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-border/60 -translate-y-1/2" />
        
        <div className="relative flex items-center justify-between py-8 px-4 overflow-x-auto gap-2">
          {sorted.map((snap, idx) => {
            const prev = idx > 0 ? sorted[idx - 1] : undefined;
            const insight = getInsight(snap, prev);
            const heightPercent = Math.max(20, (snap.score / maxScore) * 100);
            const date = new Date(snap.data + "T00:00:00");
            const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

            return (
              <Tooltip key={snap.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setActiveIdx(idx);
                      onSelectSnapshot?.(snap);
                    }}
                    className={cn(
                      "relative flex flex-col items-center gap-1 group cursor-pointer transition-all duration-300 min-w-[48px]",
                      activeIdx === idx && "scale-110"
                    )}
                  >
                    {/* Bar */}
                    <div
                      className={cn(
                        "w-3 rounded-full transition-all duration-500",
                        getScoreColor(snap.score),
                        activeIdx === idx ? "shadow-lg" : "shadow-sm",
                        "group-hover:shadow-lg"
                      )}
                      style={{ height: `${heightPercent * 0.6}px`, minHeight: 12 }}
                    />
                    {/* Dot */}
                    <div className={cn(
                      "w-3 h-3 rounded-full border-2 border-background transition-all",
                      getScoreColor(snap.score),
                      activeIdx === idx && "ring-2 ring-primary/50"
                    )} />
                    <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">{dateStr}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] p-3 space-y-1.5">
                  <p className="font-semibold text-xs">{dateStr}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <span className="text-muted-foreground">Score:</span>
                    <span className="font-medium">{snap.score}</span>
                    <span className="text-muted-foreground">Ganhos:</span>
                    <span className="font-medium text-emerald-400">{snap.ganhos}</span>
                    <span className="text-muted-foreground">Perdas:</span>
                    <span className="font-medium text-red-400">{snap.perdas}</span>
                    <span className="text-muted-foreground">Conversão:</span>
                    <span className="font-medium">{snap.conversao}%</span>
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">{snap.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                  <p className="text-[11px] pt-1 border-t border-border/50 mt-1">{insight}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}
