import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PerformanceTeam, UserProfile } from "@/hooks/usePerformanceData";

interface Filters {
  mes: number;
  ano: number;
  teamId: string | undefined;
  userId: string | undefined;
}

interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  teams: PerformanceTeam[];
  users: UserProfile[];
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function PerformanceFilters({ filters, setFilters, teams, users }: Props) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="flex flex-wrap gap-2">
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

      <Select value={filters.teamId || "all"} onValueChange={v => setFilters({ ...filters, teamId: v === "all" ? undefined : v })}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="Todas Equipes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">Todas Equipes</SelectItem>
          {teams.map(t => (
            <SelectItem key={t.id} value={t.id} className="text-xs">{t.nome}</SelectItem>
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
