import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { Download, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface JobRow {
  id: string;
  report_type: string;
  status: "pending" | "processing" | "ready" | "error";
  filters: any;
  period_start: string | null;
  period_end: string | null;
  requested_by: string;
  created_at: string;
  completed_at: string | null;
  file_url: string | null;
  error_message: string | null;
  row_count: number | null;
}

const TYPE_LABEL: Record<string, string> = {
  historico_atendimentos: "Histórico de atendimentos",
  consumo: "Consumo",
  csat: "Pesquisa CSAT",
  ctwa: "CTWA",
  metricas: "Métricas de atendimento",
  status_atendentes: "Status dos atendentes",
  auditoria: "Auditoria",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  processing: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  ready: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  error: "bg-rose-500/15 text-rose-500 border-rose-500/30",
};

export function DownloadRelatoriosTab() {
  const tenantId = useActiveCompanyId();
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    let q = supabase
      .from("analytics_export_jobs" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (typeFilter !== "all") q = q.eq("report_type", typeFilter);
    const { data } = await q;
    setRows(((data || []) as unknown) as JobRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[210px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select disabled>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Solicitado por" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem></SelectContent>
        </Select>
        <Button variant="outline" size="sm" disabled className="h-8">Selecionar período</Button>
        <Button variant="outline" size="icon" className="h-8 w-8 ml-auto" onClick={load}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground uppercase">
            <tr>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Solicitante</th>
              <th className="text-left px-3 py-2">Período coberto</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Solicitado</th>
              <th className="text-right px-3 py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                Nenhuma exportação solicitada ainda. Use o ícone de download nas outras sub-abas para gerar relatórios.
              </td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{TYPE_LABEL[r.report_type] || r.report_type}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.requested_by.slice(0, 8)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {r.period_start && r.period_end
                    ? `${format(new Date(r.period_start), "dd/MM/yy")} — ${format(new Date(r.period_end), "dd/MM/yy")}`
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge className={cn("text-[10px] border", STATUS_STYLE[r.status])}>
                    {r.status === "pending" ? "Pendente" :
                     r.status === "processing" ? "Processando" :
                     r.status === "ready" ? "Pronto" : "Erro"}
                  </Badge>
                  {r.error_message && <div className="text-[10px] text-rose-500 mt-1">{r.error_message}</div>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {format(new Date(r.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.status === "ready" && r.file_url ? (
                    <Button variant="outline" size="sm" className="h-7 gap-1.5" asChild>
                      <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5" /> Baixar
                      </a>
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
