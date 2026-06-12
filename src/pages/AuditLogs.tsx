import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, ChevronLeft, ChevronRight, Eye, Shield, Calendar, Download, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AuditExportFileCard } from "@/components/audit/AuditExportFileCard";
import { toast } from "sonner";


interface AuditLog {
  id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  servidor_id: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  create_user: "Criar Usuário",
  edit_user: "Editar Usuário",
  delete_user: "Excluir Usuário",
  change_role: "Alterar Perfil",
  change_permissions: "Alterar Permissões",
  change_data_scope: "Alterar Escopo",
  create_workspace: "Criar Workspace",
  edit_workspace: "Editar Workspace",
  delete_workspace: "Excluir Workspace",
  create_lead: "Criar Lead",
  edit_lead: "Editar Lead",
  delete_lead: "Excluir Lead",
  change_lead_owner: "Alterar Dono do Lead",
  mark_lead_won: "Marcar Lead Ganho",
  mark_lead_lost: "Marcar Lead Perdido",
  move_lead_stage: "Mover Etapa",
  create_proposal: "Criar Proposta",
  edit_proposal: "Editar Proposta",
  delete_proposal: "Excluir Proposta",
  apply_discount: "Aplicar Desconto",
  change_final_price: "Alterar Valor Final",
  create_contract: "Criar Contrato",
  send_signature: "Enviar p/ Assinatura",
  cancel_signature: "Cancelar Assinatura",
  settle_payment: "Liquidar Pagamento",
  create_transaction: "Criar Cobrança",
  edit_transaction: "Editar Cobrança",
  delete_transaction: "Excluir Cobrança",
  change_integration: "Alterar Integração",
  change_tenant_limits: "Alterar Limites",
  change_billing_plan: "Alterar Plano",
  manage_tenant: "Gestão de Tenant",
};

const TARGET_LABELS: Record<string, string> = {
  user: "Usuário",
  role: "Perfil",
  permission: "Permissão",
  workspace: "Workspace",
  lead: "Lead",
  proposal: "Proposta",
  contract: "Contrato",
  transaction: "Cobrança",
  integration: "Integração",
  tenant: "Tenant",
  document: "Documento",
};

const PAGE_SIZE = 25;

export default function AuditLogs() {
  const { role, profile, session } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [pagePathFilter, setPagePathFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  const hasAccess =
    profile?.is_master === true || role === "admin" || role === "ceo" || role === "master";

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, targetFilter, pagePathFilter, dateFrom, dateTo]);


  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query: any = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter !== "all") query = query.eq("action", actionFilter);
      if (targetFilter !== "all") query = query.eq("target_type", targetFilter);
      if (dateFrom) query = query.gte("created_at", dateFrom.toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }
      if (pagePathFilter) query = query.eq("details->>page_path", pagePathFilter);
      if (search.trim()) {
        query = query.or(`user_name.ilike.%${search.trim()}%,target_id.ilike.%${search.trim()}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      setLogs((data || []) as AuditLog[]);
      setTotal(count || 0);

    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const uniqueActions = Object.keys(ACTION_LABELS);
  const uniqueTargets = Object.keys(TARGET_LABELS);

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const { data, error } = await supabase.functions.invoke("audit-export-csv", {
        body: {
          filters: {
            from: dateFrom?.toISOString(),
            to: dateTo?.toISOString(),
            action: actionFilter !== "all" ? actionFilter : undefined,
            target_type: targetFilter !== "all" ? targetFilter : undefined,
            page_path: pagePathFilter || undefined,
          },
        },
      });
      if (error) throw error;
      // The function returns CSV text; build a blob client-side
      const csv = typeof data === "string" ? data : new TextDecoder().decode(data as any);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exportação iniciada");
    } catch (err: any) {
      toast.error("Erro ao exportar", { description: err?.message });
    } finally {
      setExportingCsv(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-foreground mb-1">Acesso Restrito</h2>
          <p className="text-muted-foreground text-sm">Apenas Admin, CEO e Master podem acessar os logs de auditoria.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs de Auditoria</h1>
          <p className="text-sm text-muted-foreground">Rastreabilidade de ações críticas do sistema</p>
        </div>
        <Button size="sm" variant="default" onClick={handleExportCsv} disabled={exportingCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          {exportingCsv ? "Exportando..." : "Exportar CSV"}
        </Button>
      </div>

      {pagePathFilter && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border bg-purple-500/10 border-purple-500/30">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-200">FILTRO ATIVO · PÁGINA</Badge>
            <code className="font-mono text-purple-200">{pagePathFilter}</code>
          </div>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setPagePathFilter(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}


      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por usuário ou entidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {uniqueActions.map((a) => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={targetFilter} onValueChange={(v) => { setTargetFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os módulos</SelectItem>
            {uniqueTargets.map((t) => (
              <SelectItem key={t} value={t}>{TARGET_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {dateFrom ? format(dateFrom, "dd/MM", { locale: ptBR }) : "De"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {dateTo ? format(dateTo, "dd/MM", { locale: ptBR }) : "Até"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent mode="single" selected={dateTo} onSelect={setDateTo} />
          </PopoverContent>
        </Popover>

        <Button variant="secondary" size="sm" className="h-9" onClick={handleSearch}>
          <Search className="h-3.5 w-3.5 mr-1" /> Filtrar
        </Button>
        {(search || actionFilter !== "all" || targetFilter !== "all" || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => {
            setSearch(""); setActionFilter("all"); setTargetFilter("all"); setDateFrom(undefined); setDateTo(undefined); setPage(0);
            setTimeout(fetchLogs, 50);
          }}>Limpar</Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell>
              </TableRow>
            ) : logs.map((log) => (
              <TableRow key={log.id} className="cursor-pointer" onClick={() => setSelectedLog(log)}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </TableCell>
                <TableCell className="font-medium text-sm">{log.user_name || "Sistema"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {ACTION_LABELS[log.action] || log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {TARGET_LABELS[log.target_type] || log.target_type}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                  {log.target_id?.substring(0, 8) || "—"}
                </TableCell>
                <TableCell>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{total} registros</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Usuário</p>
                  <p className="font-medium">{selectedLog.user_name || "Sistema"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ação</p>
                  <Badge variant="secondary">{ACTION_LABELS[selectedLog.action] || selectedLog.action}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Módulo</p>
                  <p>{TARGET_LABELS[selectedLog.target_type] || selectedLog.target_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ID da Entidade</p>
                  <p className="font-mono text-xs">{selectedLog.target_id || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IP</p>
                  <p className="font-mono text-xs">{selectedLog.ip_address || "—"}</p>
                </div>
                {selectedLog.details?.page_path && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Página</p>
                    <button
                      onClick={() => { setPagePathFilter(selectedLog.details!.page_path); setSelectedLog(null); }}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {selectedLog.details.page_path}
                    </button>
                  </div>
                )}
              </div>
              {selectedLog.details?.export_file && (
                <AuditExportFileCard file={selectedLog.details.export_file} />
              )}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Detalhes (payload)</p>
                  <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
}
