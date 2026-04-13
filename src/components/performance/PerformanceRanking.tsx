import type { PerformanceGoal, UserProfile, PerformanceTeam } from "@/hooks/usePerformanceData";
import { Trophy, Medal, Award } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  goals: PerformanceGoal[];
  users: UserProfile[];
  teams: PerformanceTeam[];
}

function getUserName(userId: string | null, users: UserProfile[]): string {
  if (!userId) return "—";
  return users.find(u => u.user_id === userId)?.name || "Usuário";
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function getRankIcon(position: number) {
  if (position === 0) return <Trophy className="h-4 w-4 text-amber-400" />;
  if (position === 1) return <Medal className="h-4 w-4 text-gray-300" />;
  if (position === 2) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{position + 1}</span>;
}

export function PerformanceRanking({ goals, users, teams }: Props) {
  const userGoals = goals
    .filter(g => g.user_id)
    .sort((a, b) => (b.percentual || 0) - (a.percentual || 0));

  const teamGoals = goals
    .filter(g => g.team_id && !g.user_id)
    .sort((a, b) => (b.percentual || 0) - (a.percentual || 0));

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">🏆 Ranking</h3>
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="w-full bg-muted/30 mb-3">
          <TabsTrigger value="users" className="flex-1 text-xs">Colaboradores</TabsTrigger>
          <TabsTrigger value="teams" className="flex-1 text-xs">Equipes</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-2 mt-0">
          {userGoals.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma meta individual cadastrada.</p>
          )}
          {userGoals.slice(0, 10).map((goal, idx) => {
            const name = getUserName(goal.user_id, users);
            const pct = goal.percentual || 0;
            return (
              <div key={goal.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                {getRankIcon(idx)}
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold min-w-[36px] text-right",
                      pct >= 100 ? "text-emerald-400" : pct >= 70 ? "text-amber-400" : "text-red-400"
                    )}>
                      {pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="teams" className="space-y-2 mt-0">
          {teamGoals.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma meta de equipe cadastrada.</p>
          )}
          {teamGoals.slice(0, 10).map((goal, idx) => {
            const team = teams.find(t => t.id === goal.team_id);
            const pct = goal.percentual || 0;
            return (
              <div key={goal.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                {getRankIcon(idx)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{team?.nome || "Equipe"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold min-w-[36px] text-right",
                      pct >= 100 ? "text-emerald-400" : pct >= 70 ? "text-amber-400" : "text-red-400"
                    )}>
                      {pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
