import { useMemo } from "react";
import type { PerformanceGoal, PerformanceSnapshot, UserProfile, WorkspaceKPI } from "@/hooks/usePerformanceData";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, Target, Award, AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  goals: PerformanceGoal[];
  snapshots: PerformanceSnapshot[];
  users: UserProfile[];
  workspaceKpis?: WorkspaceKPI[];
  onSelectUser: (user: UserProfile) => void;
}

type UserStatus = "acima" | "dentro" | "abaixo" | "risco";

function getStatus(pct: number): UserStatus {
  if (pct >= 100) return "acima";
  if (pct >= 70) return "dentro";
  if (pct >= 40) return "abaixo";
  return "risco";
}

const statusConfig: Record<UserStatus, { label: string; color: string; bg: string; border: string }> = {
  acima: { label: "Acima da meta", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  dentro: { label: "Dentro da meta", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  abaixo: { label: "Abaixo da meta", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  risco: { label: "Em risco", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function getTrend(snaps: PerformanceSnapshot[]): "up" | "down" | "stable" {
  if (snaps.length < 2) return "stable";
  const recent = snaps.slice(-3);
  const older = snaps.slice(-6, -3);
  if (older.length === 0) return "stable";
  const recentAvg = recent.reduce((s, sn) => s + sn.score, 0) / recent.length;
  const olderAvg = older.reduce((s, sn) => s + sn.score, 0) / older.length;
  if (recentAvg > olderAvg + 5) return "up";
  if (recentAvg < olderAvg - 5) return "down";
  return "stable";
}

export function PerformanceTeamView({ goals, snapshots, users, workspaceKpis, onSelectUser }: Props) {
  const teamData = useMemo(() => {
    // Group by user
    const userIds = [...new Set(goals.filter(g => g.user_id).map(g => g.user_id!))];
    // Also include users that appear in snapshots but not goals
    snapshots.forEach(s => {
      if (s.user_id && !userIds.includes(s.user_id)) userIds.push(s.user_id);
    });

    return userIds.map(uid => {
      const user = users.find(u => u.user_id === uid);
      const userGoal = goals.find(g => g.user_id === uid);
      const userSnaps = snapshots.filter(s => s.user_id === uid).sort((a, b) => a.data.localeCompare(b.data));
      const meta = userGoal?.meta_valor || 0;
      const realizado = userGoal?.realizado_valor || userSnaps.reduce((s, sn) => s + sn.valor_total, 0);
      const pct = meta > 0 ? Math.round((realizado / meta) * 100) : (realizado > 0 ? 100 : 0);
      const status = getStatus(pct);
      const trend = getTrend(userSnaps);
      const ganhos = userSnaps.reduce((s, sn) => s + sn.ganhos, 0);
      const perdas = userSnaps.reduce((s, sn) => s + sn.perdas, 0);
      const conversao = (ganhos + perdas) > 0 ? Math.round((ganhos / (ganhos + perdas)) * 100) : 0;

      return {
        user,
        userId: uid,
        meta,
        realizado,
        pct,
        status,
        trend,
        ganhos,
        perdas,
        conversao,
        snapsCount: userSnaps.length,
        lastScore: userSnaps.length > 0 ? userSnaps[userSnaps.length - 1].score : 0,
      };
    }).sort((a, b) => b.pct - a.pct);
  }, [goals, snapshots, users]);

  // Team summary
  const teamMeta = teamData.reduce((s, d) => s + d.meta, 0);
  const teamRealizado = teamData.reduce((s, d) => s + d.realizado, 0);
  const teamPct = teamMeta > 0 ? Math.round((teamRealizado / teamMeta) * 100) : 0;
  const teamGanhos = teamData.reduce((s, d) => s + d.ganhos, 0);
  const teamPerdas = teamData.reduce((s, d) => s + d.perdas, 0);

  const statusCounts = useMemo(() => {
    const counts: Record<UserStatus, number> = { acima: 0, dentro: 0, abaixo: 0, risco: 0 };
    teamData.forEach(d => counts[d.status]++);
    return counts;
  }, [teamData]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Team Summary */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">👥 Visão do Time</h3>
            <div className="flex items-center gap-2">
              {(["acima", "dentro", "abaixo", "risco"] as UserStatus[]).map(s => (
                statusCounts[s] > 0 && (
                  <Badge key={s} variant="outline" className={cn("text-[10px] gap-1", statusConfig[s].color, statusConfig[s].border)}>
                    {statusCounts[s]} {statusConfig[s].label.split(" ")[0]}
                  </Badge>
                )
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Meta Total</p>
              <p className="text-sm font-bold">{teamMeta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Realizado</p>
              <p className="text-sm font-bold text-emerald-400">{teamRealizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">% Atingido</p>
              <p className={cn("text-sm font-bold", teamPct >= 100 ? "text-emerald-400" : teamPct >= 70 ? "text-amber-400" : "text-red-400")}>{teamPct}%</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Ganhos / Perdas</p>
              <p className="text-sm font-bold">{teamGanhos} / {teamPerdas}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                teamPct >= 100 ? "bg-emerald-500" : teamPct >= 70 ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${Math.min(teamPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Collaborator List */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">📊 Colaboradores ({teamData.length})</h3>
          <div className="space-y-2">
            {teamData.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Nenhum colaborador com dados no período selecionado.
              </p>
            )}
            {teamData.map((d) => {
              const sc = statusConfig[d.status];
              return (
                <Tooltip key={d.userId}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => d.user && onSelectUser(d.user)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-xl p-3 border transition-all hover:shadow-md hover:shadow-primary/5",
                        sc.border, "bg-card hover:border-primary/30"
                      )}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                          {getInitials(d.user?.name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{d.user?.name || "Usuário"}</span>
                          <Badge variant="outline" className={cn("text-[9px] h-4 shrink-0", sc.color, sc.border)}>
                            {sc.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[200px]">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                d.pct >= 100 ? "bg-emerald-500" : d.pct >= 70 ? "bg-amber-500" : d.pct >= 40 ? "bg-orange-500" : "bg-red-500"
                              )}
                              style={{ width: `${Math.min(d.pct, 100)}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-bold min-w-[36px]", sc.color)}>{d.pct}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-muted-foreground">Meta</p>
                          <p className="text-xs font-medium">{d.meta > 0 ? d.meta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-muted-foreground">Realizado</p>
                          <p className="text-xs font-medium text-emerald-400">{d.realizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {d.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-400" />}
                          {d.trend === "down" && <TrendingDown className="h-4 w-4 text-red-400" />}
                          {d.trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="p-3 space-y-1 max-w-[200px]">
                    <p className="font-semibold text-xs">{d.user?.name}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                      <span className="text-muted-foreground">Ganhos:</span>
                      <span className="text-emerald-400 font-medium">{d.ganhos}</span>
                      <span className="text-muted-foreground">Perdas:</span>
                      <span className="text-red-400 font-medium">{d.perdas}</span>
                      <span className="text-muted-foreground">Conversão:</span>
                      <span className="font-medium">{d.conversao}%</span>
                      <span className="text-muted-foreground">Score:</span>
                      <span className="font-medium">{d.lastScore}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
