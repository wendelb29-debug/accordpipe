import type { PerformanceTeam, PerformanceGoal, UserProfile } from "@/hooks/usePerformanceData";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Props {
  teams: PerformanceTeam[];
  goals: PerformanceGoal[];
  users: UserProfile[];
  onSelectUser?: (user: UserProfile) => void;
}

function getUserName(userId: string | null, users: UserProfile[]): string {
  if (!userId) return "—";
  return users.find(u => u.user_id === userId)?.name || "Usuário";
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function PerformanceHierarchy({ teams, goals, users, onSelectUser }: Props) {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleTeam = (id: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (teams.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">🌳 Hierarquia</h3>
        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma equipe cadastrada.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">🌳 Hierarquia</h3>
      <div className="space-y-2">
        {teams.map(team => {
          const expanded = expandedTeams.has(team.id);
          const teamGoal = goals.find(g => g.team_id === team.id && !g.user_id);
          const pct = teamGoal?.percentual || 0;
          const gestorName = getUserName(team.gestor_id, users);
          const supervisorName = getUserName(team.supervisor_id, users);

          // Get members from goals (users with goals for this team)
          const memberGoals = goals.filter(g => g.team_id === team.id && g.user_id);

          return (
            <div key={team.id}>
              <button
                onClick={() => toggleTeam(team.id)}
                className="flex items-center gap-3 w-full rounded-lg p-3 hover:bg-muted/30 transition-colors text-left"
              >
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
                <Users className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{team.nome}</p>
                  <p className="text-[10px] text-muted-foreground">Gestor: {gestorName} • Supervisor: {supervisorName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500")}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground min-w-[32px] text-right">{pct}%</span>
                </div>
              </button>

              {expanded && (
                <div className="ml-8 pl-4 border-l border-border/30 space-y-1 mt-1 mb-2">
                  {memberGoals.map(mg => {
                    const memberUser = users.find(u => u.user_id === mg.user_id);
                    const memberName = memberUser?.name || "Usuário";
                    const memberPct = mg.percentual || 0;
                    return (
                      <button
                        key={mg.id}
                        onClick={() => memberUser && onSelectUser?.(memberUser)}
                        className="flex items-center gap-2 w-full rounded-lg p-2 hover:bg-muted/20 transition-colors"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{getInitials(memberName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs flex-1 text-left truncate">{memberName}</span>
                        <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", memberPct >= 100 ? "bg-emerald-500" : memberPct >= 70 ? "bg-amber-500" : "bg-red-500")}
                            style={{ width: `${Math.min(memberPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">{memberPct}%</span>
                      </button>
                    );
                  })}
                  {memberGoals.length === 0 && (
                    <p className="text-[10px] text-muted-foreground py-2 pl-2">Sem membros com metas neste período.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
