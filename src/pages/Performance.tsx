import { useState } from "react";
import { TrendingUp, Sparkles } from "lucide-react";
import { usePerformanceData, type UserProfile } from "@/hooks/usePerformanceData";
import { PerformanceKPIs } from "@/components/performance/PerformanceKPIs";
import { PerformanceTimeline } from "@/components/performance/PerformanceTimeline";
import { PerformanceRanking } from "@/components/performance/PerformanceRanking";
import { PerformanceAlerts } from "@/components/performance/PerformanceAlerts";
import { PerformanceHierarchy } from "@/components/performance/PerformanceHierarchy";
import { PerformanceDetailDrawer } from "@/components/performance/PerformanceDetailDrawer";
import { PerformanceFilters } from "@/components/performance/PerformanceFilters";
import { Skeleton } from "@/components/ui/skeleton";

export default function Performance() {
  const now = new Date();
  const [filters, setFilters] = useState({
    mes: now.getMonth() + 1,
    ano: now.getFullYear(),
    teamId: undefined as string | undefined,
    userId: undefined as string | undefined,
  });

  const { teams, goals, snapshots, users, loading, kpis } = usePerformanceData(filters);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

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
        <PerformanceFilters filters={filters} setFilters={setFilters} teams={teams} users={users} />
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
          <PerformanceKPIs {...kpis} />

          {/* Alerts */}
          <PerformanceAlerts goals={goals} users={users} teams={teams} />

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
      />
    </div>
  );
}
