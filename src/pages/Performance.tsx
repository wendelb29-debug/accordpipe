import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { usePerformanceData, type UserProfile } from "@/hooks/usePerformanceData";
import { PerformanceKPIs } from "@/components/performance/PerformanceKPIs";
import { PerformanceTimeline } from "@/components/performance/PerformanceTimeline";
import { PerformanceRanking } from "@/components/performance/PerformanceRanking";
import { PerformanceAlerts } from "@/components/performance/PerformanceAlerts";
import { PerformanceHierarchy } from "@/components/performance/PerformanceHierarchy";
import { PerformanceDetailDrawer } from "@/components/performance/PerformanceDetailDrawer";
import { PerformanceFilters } from "@/components/performance/PerformanceFilters";
import { PerformanceTeamView } from "@/components/performance/PerformanceTeamView";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import { useWorkspaces } from "@/hooks/useWorkspaces";

export default function Performance() {
  const now = new Date();
  const [filters, setFilters] = useState({
    mes: now.getMonth() + 1,
    ano: now.getFullYear(),
    teamId: undefined as string | undefined,
    userId: undefined as string | undefined,
    workspaceId: undefined as string | undefined,
  });

  const { filterAllowedWorkspaces } = useWorkspacePermissions();
  const { workspaces: allWorkspaces } = useWorkspaces();
  const allowedWorkspaces = useMemo(
    () => filterAllowedWorkspaces(allWorkspaces),
    [allWorkspaces, filterAllowedWorkspaces]
  );

  // Auto-select workspace if user only has access to one
  const effectiveFilters = useMemo(() => {
    if (!filters.workspaceId && allowedWorkspaces.length === 1) {
      return { ...filters, workspaceId: allowedWorkspaces[0].id };
    }
    return filters;
  }, [filters, allowedWorkspaces]);

  const rawPerf = usePerformanceData(effectiveFilters);

  // Filter teams by workspace permissions
  const allowedTeams = rawPerf.teams.filter((t) => {
    if (!t.workspace_id) return true;
    return filterAllowedWorkspaces([{ id: t.workspace_id }]).length > 0;
  });
  const allowedTeamIds = new Set(allowedTeams.map((t) => t.id));

  const teams = allowedTeams;
  const goals = rawPerf.goals.filter((g) => !g.team_id || allowedTeamIds.has(g.team_id));
  const snapshots = rawPerf.snapshots.filter((s) => !s.team_id || allowedTeamIds.has(s.team_id));
  const { users, loading, kpis, workspaceKpis } = rawPerf;

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Show team view when a workspace is selected
  const hasWorkspaceSelected = !!effectiveFilters.workspaceId;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Accord Performance</h1>
              <p className="text-xs text-muted-foreground">Centro de Inteligência e Performance</p>
            </div>
          </div>
        </div>
        <PerformanceFilters
          filters={effectiveFilters}
          setFilters={setFilters}
          teams={teams}
          users={users}
          workspaces={allowedWorkspaces.map((w) => ({ id: w.id, name: w.name }))}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <PerformanceKPIs
            {...kpis}
            workspaceKpis={workspaceKpis}
            snapshots={snapshots}
          />

          {/* Alerts */}
          <PerformanceAlerts goals={goals} users={users} teams={teams} />

          {/* Team View (when workspace selected) */}
          {hasWorkspaceSelected && (
            <PerformanceTeamView
              goals={goals}
              snapshots={snapshots}
              users={users}
              workspaceKpis={workspaceKpis}
              onSelectUser={(u) => setSelectedUser(u)}
            />
          )}

          {/* Timeline */}
          <PerformanceTimeline snapshots={snapshots} onSelectSnapshot={(snap) => {
            if (snap.user_id) {
              const u = users.find(usr => usr.user_id === snap.user_id);
              if (u) setSelectedUser(u);
            }
          }} />

          {/* Ranking + Hierarchy */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PerformanceRanking goals={goals} users={users} teams={teams} />
            <PerformanceHierarchy
              teams={teams}
              goals={goals}
              users={users}
              onSelectUser={(u) => setSelectedUser(u)}
            />
          </div>
        </>
      )}

      {/* Detail Drawer */}
      <PerformanceDetailDrawer
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
        goals={goals}
        snapshots={snapshots}
        teamAvgScore={snapshots.length > 0 ? Math.round(snapshots.reduce((s, sn) => s + sn.score, 0) / snapshots.length) : 0}
        teamAvgConversao={(() => {
          const g = snapshots.reduce((s, sn) => s + sn.ganhos, 0);
          const p = snapshots.reduce((s, sn) => s + sn.perdas, 0);
          return (g + p) > 0 ? Math.round((g / (g + p)) * 100) : 0;
        })()}
        workspaceKpis={workspaceKpis}
      />
    </div>
  );
}
