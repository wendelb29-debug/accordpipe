import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Eye, Shield, AlertTriangle, FileText, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ACTION_LABELS, TARGET_LABELS, MODULE_LABELS,
  getActionStyle, isSensitive, STATUS_STYLE, SEVERITY_STYLE,
  userColor, initials, formatDuration,
} from "./audit-helpers";
import type { AuditLogRow, AuditSort } from "@/hooks/useAuditLogs";

interface Props {
  rows: AuditLogRow[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
  sort: AuditSort;
  onSortChange: (s: AuditSort) => void;
  onSelect: (row: AuditLogRow) => void;
}

const columns: { key: AuditSort["column"] | "actions"; label: string; sortable?: boolean; className?: string }[] = [
  { key: "created_at", label: "Data / Hora", sortable: true, className: "w-[180px]" },
  { key: "user_name",  label: "Responsável", sortable: true, className: "w-[220px]" },
  { key: "action",     label: "Ação",        sortable: true, className: "w-[180px]" },
  { key: "target_type", label: "Entidade",   sortable: true, className: "w-[220px]" },
  { key: "status",     label: "Status",      sortable: true, className: "w-[130px]" },
  { key: "duration_ms", label: "Duração",    sortable: true, className: "w-[100px]" },
  { key: "actions",    label: "",            className: "w-[60px]" },
];

export function AuditTable({
  rows, loading, total, page, pageSize, onPageChange, onPageSizeChange, sort, onSortChange, onSelect,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleSort = (col: AuditSort["column"]) => {
    if (sort.column === col) onSortChange({ column: col, direction: sort.direction === "asc" ? "desc" : "asc" });
    else onSortChange({ column: col, direction: "desc" });
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className={cn("px-4 py-2.5 text-left font-medium", c.className)}
                >
                  {c.sortable ? (
                    <button
                      onClick={() => toggleSort(c.key as AuditSort["column"])}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {c.label}
                      <ArrowUpDown className={cn("h-3 w-3", sort.column === c.key ? "text-primary" : "opacity-40")} />
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-border/40">
                {columns.map((c, j) => (
                  <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full max-w-[180px]" /></td>
                ))}
              </tr>
            ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="mx-auto flex flex-col items-center gap-3">
                    <div className="rounded-full bg-muted p-3">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-sm font-medium">Nenhum evento encontrado</div>
                    <div className="text-xs text-muted-foreground max-w-sm">
                      Ajuste os filtros ou o período para ver eventos de auditoria.
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {rows.map((row) => {
              const style = getActionStyle(row.action);
              const sens = isSensitive(row.action);
              const statusCls = row.status ? STATUS_STYLE[row.status] : "";
              const sevCls = row.severity ? SEVERITY_STYLE[row.severity] : "";
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row)}
                  className="border-b border-border/40 last:border-b-0 hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  {/* Data / Hora */}
                  <td className="px-4 py-3 align-top">
                    <div className="text-sm font-medium">
                      {format(new Date(row.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(row.created_at), "HH:mm:ss", { locale: ptBR })}
                      {" · "}
                      {formatDistanceToNowStrict(new Date(row.created_at), { locale: ptBR, addSuffix: true })}
                    </div>
                  </td>

                  {/* Responsável */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold shrink-0",
                        userColor(row.user_id),
                      )}>
                        {initials(row.user_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{row.user_name || "Sistema"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {row.actor_type ? row.actor_type : (row.module ? MODULE_LABELS[row.module] || row.module : "—")}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Ação */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      <Badge className={cn("w-fit border-transparent font-semibold text-[10px] tracking-wide", style.cls)}>
                        {style.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                        {row.title || ACTION_LABELS[row.action] || row.action}
                      </span>
                    </div>
                  </td>

                  {/* Entidade */}
                  <td className="px-4 py-3 align-top">
                    <div className="text-sm">
                      {TARGET_LABELS[row.target_type] || row.entity_type || row.target_type || "—"}
                    </div>
                    {(row.target_id || row.entity_id) && (
                      <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">
                        #{(row.target_id || row.entity_id)!.slice(0, 8)}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      {row.status && (
                        <Badge className={cn("w-fit border-transparent text-[10px] font-semibold", statusCls)}>
                          {row.status}
                        </Badge>
                      )}
                      {row.severity && (
                        <Badge className={cn("w-fit border-transparent text-[10px]", sevCls)}>
                          {row.severity}
                        </Badge>
                      )}
                      {!row.status && !row.severity && sens && (
                        <Badge variant="outline" className="w-fit gap-1 text-[10px] border-amber-500/40 text-amber-600">
                          <Shield className="h-3 w-3" /> sensível
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Duração */}
                  <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                    {formatDuration(row.duration_ms)}
                    {row.error_message && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="truncate max-w-[80px]">erro</span>
                      </div>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3 align-top">
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ver detalhes">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20">
        <div className="text-xs text-muted-foreground">
          {total > 0 ? (
            <>Mostrando <b>{(page - 1) * pageSize + 1}</b>–<b>{Math.min(page * pageSize, total)}</b> de <b>{total}</b></>
          ) : "—"}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} / página</option>)}
          </select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-xs tabular-nums px-2">
            {page} / {totalPages}
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
