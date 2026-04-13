import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PerformanceTeam, UserProfile } from "@/hooks/usePerformanceData";

interface Workspace {
  id: string;
  name: string;
}

interface Filters {
  mes: number;
  ano: number;
  teamId: string | undefined;
  userId: string | undefined;
  workspaceId: string | undefined;
}

interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  teams: PerformanceTeam[];
  users: UserProfile[];
  workspaces?: Workspace[];
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function PerformanceFilters({ filters, setFilters, teams, users, workspaces }: Props) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="flex flex-wrap gap-2">
      {/* Workspace selector */}
      {workspaces && workspaces.length > 0 && (
        <Select
          value={filters.workspaceId || "all"}
          onValueChange={v => setFilters({ ...filters, workspaceId: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Todos Workspaces" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todos Workspaces</SelectItem>
            {workspaces.map(w => (
              <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={String(filters.mes)} onValueChange={v => setFilters({ ...filters, mes: Number(v) })}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MESES.map((m, i) => (
            <SelectItem key={i} value={String(i + 1)} className="text-xs">{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(filters.ano)} onValueChange={v => setFilters({ ...filters, ano: Number(v) })}>
        <SelectTrigger className="w-[100px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>


      <Select value={filters.userId || "all"} onValueChange={v => setFilters({ ...filters, userId: v === "all" ? undefined : v })}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Todos Colaboradores" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">Todos Colaboradores</SelectItem>
          {users.map(u => (
            <SelectItem key={u.user_id} value={u.user_id} className="text-xs">{u.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
