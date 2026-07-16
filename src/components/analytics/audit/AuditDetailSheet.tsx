import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ACTION_LABELS, TARGET_LABELS, MODULE_LABELS,
  getActionStyle, STATUS_STYLE, SEVERITY_STYLE, userColor, initials, maskIp, formatDuration,
} from "./audit-helpers";
import type { AuditLogRow } from "@/hooks/useAuditLogs";
import { Shield, AlertTriangle, Clock, User, Monitor, Globe, Hash, Layers, Zap } from "lucide-react";

interface Props {
  row: AuditLogRow | null;
  onOpenChange: (v: boolean) => void;
}

export function AuditDetailSheet({ row, onOpenChange }: Props) {
  return (
    <Sheet open={!!row} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {row && <Content row={row} />}
      </SheetContent>
    </Sheet>
  );
}

function Content({ row }: { row: AuditLogRow }) {
  const style = getActionStyle(row.action);
  const details = row.details || {};

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2 text-base">
          <Badge className={cn("border-transparent font-semibold text-[10px] tracking-wide", style.cls)}>{style.label}</Badge>
          <span className="truncate">{row.title || ACTION_LABELS[row.action] || row.action}</span>
        </SheetTitle>
        {row.description && <p className="text-sm text-muted-foreground">{row.description}</p>}
      </SheetHeader>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetaCell icon={Clock} label="Data / hora"
          value={format(new Date(row.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })} />
        {row.duration_ms != null && (
          <MetaCell icon={Zap} label="Duração" value={formatDuration(row.duration_ms)} />
        )}
        <MetaCell icon={User} label="Responsável" value={row.user_name || "Sistema"} sub={row.actor_type ?? undefined} />
        <MetaCell icon={Layers} label="Módulo" value={row.module ? (MODULE_LABELS[row.module] || row.module) : "—"} sub={row.source ?? undefined} />
        <MetaCell icon={Hash} label="Entidade"
          value={TARGET_LABELS[row.target_type] || row.entity_type || row.target_type || "—"}
          sub={(row.entity_id || row.target_id) ? `#${(row.entity_id || row.target_id)!.slice(0, 12)}` : undefined} />
        <MetaCell icon={Globe} label="IP" value={row.ip_address_masked || maskIp(row.ip_address)} />
        {row.device_type && <MetaCell icon={Monitor} label="Dispositivo" value={row.device_type} sub={row.browser ?? undefined} />}
        {row.request_id && <MetaCell icon={Hash} label="Request" value={row.request_id} />}
      </div>

      {/* Status / severity */}
      {(row.status || row.severity) && (
        <div className="flex items-center gap-2">
          {row.status && (
            <Badge className={cn("border-transparent font-semibold", STATUS_STYLE[row.status] || "bg-muted text-muted-foreground")}>
              {row.status}
            </Badge>
          )}
          {row.severity && (
            <Badge className={cn("border-transparent", SEVERITY_STYLE[row.severity] || "bg-muted text-muted-foreground")}>
              severidade: {row.severity}
            </Badge>
          )}
        </div>
      )}

      {/* Error */}
      {row.error_message && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">
          <div className="flex items-center gap-1.5 font-medium text-red-500 mb-1">
            <AlertTriangle className="h-4 w-4" />
            Erro {row.error_code ? `· ${row.error_code}` : ""}
          </div>
          <div className="text-muted-foreground whitespace-pre-wrap">{row.error_message}</div>
        </div>
      )}

      {/* Actor card */}
      <div className="rounded-lg border bg-card p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Quem executou</div>
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold", userColor(row.user_id))}>
            {initials(row.user_name)}
          </div>
          <div>
            <div className="text-sm font-medium">{row.user_name || "Sistema"}</div>
            <div className="text-xs text-muted-foreground">
              {row.actor_type || "usuário"} · {row.user_id ? row.user_id.slice(0, 8) + "…" : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Payload */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payload</div>
          <span className="text-[10px] text-muted-foreground">JSON</span>
        </div>
        <pre className="text-xs bg-muted/60 rounded p-3 overflow-x-auto max-h-[360px]">
{JSON.stringify(details, null, 2)}
        </pre>
      </div>

      {/* Sensitive footer */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" />
        Registro imutável. Ações aparecerão na aba de <b>Reversões</b> quando aplicável.
      </div>
    </div>
  );
}

function MetaCell({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm font-medium truncate">{value}</div>
      {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
    </div>
  );
}
