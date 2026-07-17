import { useMemo, useState, useEffect } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuditToolbar } from "@/components/analytics/audit/AuditToolbar";
import { AuditTable } from "@/components/analytics/audit/AuditTable";
import { AuditFiltersSheet } from "@/components/analytics/audit/AuditFiltersSheet";
import { AuditDetailSheet } from "@/components/analytics/audit/AuditDetailSheet";
import {
  useAuditLogs,
  DEFAULT_FILTERS,
  type AuditFiltersState,
  type AuditLogRow,
} from "@/hooks/useAuditLogs";

export function AuditoriasTab() {
  const [filters, setFilters] = useState<AuditFiltersState>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AuditLogRow | null>(null);
  const audit = useAuditLogs(filters);

  useEffect(() => {
    const t = setInterval(() => audit.pollNew(), 30_000);
    return () => clearInterval(t);
  }, [audit]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.eventTypes.length) n++;
    if (filters.modules.length) n++;
    if (filters.sources.length) n++;
    if (filters.actorIds.length) n++;
    if (filters.agentIds.length) n++;
    if (filters.channelIds.length) n++;
    if (filters.statuses.length) n++;
    if (filters.severities.length) n++;
    if (filters.hasError) n++;
    if (filters.period !== "30d") n++;
    return n;
  }, [filters]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Logs & auditoria (existente) */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Logs e auditoria</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trilha imutável de eventos, alterações e reversões do tenant.
          </p>
        </div>

        <AuditToolbar
          filters={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          onOpenFilters={() => setFiltersOpen(true)}
          onRefresh={audit.refresh}
          refreshing={audit.refreshing}
          newEventsCount={audit.newEventsCount}
          onLoadNew={audit.loadNewEvents}
          activeFilterCount={activeFilterCount}
          lastFetchAt={audit.lastFetchAt}
        />

        {audit.error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-500">
            {audit.error}
          </div>
        )}

        <AuditTable
          rows={audit.rows}
          loading={audit.loading}
          total={audit.total}
          page={audit.page}
          pageSize={audit.pageSize}
          onPageChange={audit.setPage}
          onPageSizeChange={audit.setPageSize}
          sort={audit.sort}
          onSortChange={audit.setSort}
          onSelect={setSelectedRow}
        />
      </section>

      {/* Análise de Conteúdo (nova) */}
      <aside className="rounded-2xl border border-border bg-card p-5 space-y-4 h-fit">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Análise de Conteúdo
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Regras automatizadas de monitoramento do conteúdo das conversas.
            </p>
          </div>
        </div>

        <Button size="sm" className="w-full gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Adicionar nova análise
        </Button>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase">
              <tr>
                <th className="text-left px-3 py-2">Nome</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Depto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhuma análise cadastrada.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-muted-foreground">
          A execução automatizada via IA será entregue em uma onda seguinte — nesta tela
          apenas o cadastro e a gestão das regras.
        </p>
      </aside>

      <AuditFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onApply={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />
      <AuditDetailSheet row={selectedRow} onOpenChange={(v) => !v && setSelectedRow(null)} />
    </div>
  );
}
