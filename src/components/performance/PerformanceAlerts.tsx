import type { PerformanceGoal, UserProfile, PerformanceTeam } from "@/hooks/usePerformanceData";
import { AlertTriangle, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  goals: PerformanceGoal[];
  users: UserProfile[];
  teams: PerformanceTeam[];
}

function getUserName(userId: string | null, users: UserProfile[]): string {
  if (!userId) return "—";
  return users.find(u => u.user_id === userId)?.name || "Usuário";
}

export function PerformanceAlerts({ goals, users, teams }: Props) {
  const alerts: { icon: typeof AlertTriangle; message: string; severity: "high" | "medium" | "low" }[] = [];

  // Users below target
  const belowTarget = goals.filter(g => g.user_id && (g.percentual || 0) < 50);
  if (belowTarget.length > 0) {
    alerts.push({
      icon: TrendingDown,
      message: `${belowTarget.length} colaborador${belowTarget.length > 1 ? "es" : ""} abaixo de 50% da meta`,
      severity: "high",
    });
  }

  // Teams below target
  const teamsBelowTarget = goals.filter(g => g.team_id && !g.user_id && (g.percentual || 0) < 60);
  if (teamsBelowTarget.length > 0) {
    alerts.push({
      icon: AlertTriangle,
      message: `${teamsBelowTarget.length} equipe${teamsBelowTarget.length > 1 ? "s" : ""} em risco de não atingir meta`,
      severity: "medium",
    });
  }

  // Overall goal at risk
  const totalMeta = goals.reduce((sum, g) => sum + (g.meta_valor || 0), 0);
  const totalReal = goals.reduce((sum, g) => sum + (g.realizado_valor || 0), 0);
  if (totalMeta > 0 && (totalReal / totalMeta) < 0.6) {
    alerts.push({
      icon: Target,
      message: "Meta geral do mês está em risco — realizado abaixo de 60%",
      severity: "high",
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <Target className="h-4 w-4 text-emerald-400" />
        </div>
        <p className="text-sm text-emerald-400 font-medium">Tudo sob controle — operação saudável ✅</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">⚠️ Alertas da Operação</h3>
      {alerts.map((alert, idx) => (
        <div
          key={idx}
          className={cn(
            "flex items-center gap-3 rounded-lg p-3 border",
            alert.severity === "high" && "border-red-500/30 bg-red-500/5",
            alert.severity === "medium" && "border-amber-500/30 bg-amber-500/5",
            alert.severity === "low" && "border-blue-500/30 bg-blue-500/5"
          )}
        >
          <alert.icon className={cn(
            "h-4 w-4 shrink-0",
            alert.severity === "high" && "text-red-400",
            alert.severity === "medium" && "text-amber-400",
            alert.severity === "low" && "text-blue-400"
          )} />
          <p className="text-xs font-medium text-foreground">{alert.message}</p>
        </div>
      ))}
    </div>
  );
}
