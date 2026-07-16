import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, RefreshCw, Filter, Calendar as CalIcon, Bell, X, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuditFiltersState } from "@/hooks/useAuditLogs";
import { cn } from "@/lib/utils";

interface Props {
  filters: AuditFiltersState;
  onChange: (patch: Partial<AuditFiltersState>) => void;
  onReset: () => void;
  onOpenFilters: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  newEventsCount: number;
  onLoadNew: () => void;
  activeFilterCount: number;
  lastFetchAt: Date | null;
  onExport?: () => void;
  canExport?: boolean;
}

export function AuditToolbar({
  filters, onChange, onReset, onOpenFilters, onRefresh, refreshing,
  newEventsCount, onLoadNew, activeFilterCount, lastFetchAt, onExport, canExport,
}: Props) {
  const [dateOpen, setDateOpen] = useState(false);

  const periodLabel = useMemo(() => {
    if (filters.period !== "custom") {
      return {
        today: "Hoje", yesterday: "Ontem", "7d": "Últimos 7 dias", "15d": "Últimos 15 dias",
        "30d": "Últimos 30 dias", this_month: "Este mês", last_month: "Mês passado", all: "Todos",
      }[filters.period];
    }
    if (filters.from && filters.to) {
      return `${format(filters.from, "dd/MM/yy", { locale: ptBR })} — ${format(filters.to, "dd/MM/yy", { locale: ptBR })}`;
    }
    return "Personalizado";
  }, [filters.period, filters.from, filters.to]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Buscar por título, usuário, ação, entidade, agente..."
            className="pl-9 h-9"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={filters.period} onValueChange={(v) => onChange({ period: v as AuditFiltersState["period"] })}>
          <SelectTrigger className="h-9 w-[170px]">
            <CalIcon className="h-4 w-4 mr-1.5" />
            <SelectValue>{periodLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="15d">Últimos 15 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês passado</SelectItem>
            <SelectItem value="custom">Personalizado…</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>

        {filters.period === "custom" && (
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                {filters.from ? format(filters.from, "dd/MM/yy") : "Início"} — {filters.to ? format(filters.to, "dd/MM/yy") : "Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={filters.from && filters.to ? { from: filters.from, to: filters.to } : undefined}
                onSelect={(r: any) => onChange({ from: r?.from, to: r?.to })}
                locale={ptBR}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        <Button variant="outline" size="sm" onClick={onOpenFilters} className="h-9">
          <Filter className="h-4 w-4 mr-1.5" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{activeFilterCount}</Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="h-9 text-muted-foreground">
            Limpar
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {lastFetchAt && (
            <span className="text-xs text-muted-foreground hidden md:inline">
              Atualizado {format(lastFetchAt, "HH:mm:ss", { locale: ptBR })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="h-9">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          {canExport && onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="h-9">
              <Download className="h-4 w-4 mr-1.5" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {newEventsCount > 0 && (
        <button
          onClick={onLoadNew}
          className="flex items-center gap-2 self-start rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
        >
          <Bell className="h-3.5 w-3.5" />
          {newEventsCount} novo{newEventsCount > 1 ? "s" : ""} evento{newEventsCount > 1 ? "s" : ""} · clique para carregar
        </button>
      )}
    </div>
  );
}
