import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Trash2, Download, XCircle, Calendar, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { RescueLeadDialog } from "@/components/descarte/RescueLeadDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const LOST_REASONS_MAP: Record<string, string> = {
  "DADOS INCORRETOS": "Dados Incorretos",
  "DESISTIU": "Desistiu",
  "PAROU DE RESPONDER": "Parou de Responder",
  "PREÇO CONTRATO": "Preço Contrato",
  "SEM CONTATO": "Sem Contato",
};

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

export default function Descarte() {
  const { role, isMaster } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rescueLead, setRescueLead] = useState<any>(null);

  const canRescue = isMaster || role === "admin" || role === "ceo" || role === "administrativo";

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("lead_status", "lost")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("Error fetching lost leads:", error);
      toast.error("Erro ao carregar leads descartados");
    }
    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (search) {
        const s = search.toLowerCase();
        const match = l.company_name?.toLowerCase().includes(s) ||
          l.contact_name?.toLowerCase().includes(s) ||
          l.email?.toLowerCase().includes(s) ||
          l.phone?.includes(s);
        if (!match) return false;
      }
      if (reasonFilter !== "all") {
        if (!l.lost_reason?.toUpperCase().startsWith(reasonFilter.toUpperCase())) return false;
      }
      if (dateFrom && new Date(l.updated_at) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59);
        if (new Date(l.updated_at) > to) return false;
      }
      return true;
    });
  }, [leads, search, reasonFilter, dateFrom, dateTo]);

  const reasonCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const reason = l.lost_reason?.split(":")[0]?.trim() || "Não informado";
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return counts;
  }, [leads]);

  const exportToExcel = () => {
    const data = filtered.map(l => ({
      "Empresa": l.company_name || "",
      "Contato": l.contact_name || "",
      "Email": l.email || "",
      "Telefone": l.phone || "",
      "Cidade": l.cidade || "",
      "Estado": l.estado || "",
      "Origem": l.source || "",
      "Valor P&S": l.value_ps || 0,
      "Valor MRR": l.value_mrr || 0,
      "Motivo da Perda": l.lost_reason || "",
      "Vendedor": l.created_by_name || "",
      "Data Criação": l.created_at ? formatDate(l.created_at) : "",
      "Data Perda": l.updated_at ? formatDate(l.updated_at) : "",
      "Observações": l.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads Descartados");
    XLSX.writeFile(wb, `Leads_Descartados_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.xlsx`);
    toast.success("Arquivo exportado com sucesso!");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" /> CRM de Descarte
          </h1>
          <p className="text-xs text-muted-foreground">{leads.length} lead(s) perdido(s) no total</p>
        </div>
        <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0}>
          <Download className="h-3.5 w-3.5" /> Exportar Excel
        </Button>
      </div>

      {/* Reason summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(reasonCounts).map(([reason, count]) => (
          <Card key={reason}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground truncate max-w-24" title={reason}>{LOST_REASONS_MAP[reason] || reason}</p>
                <p className="text-lg font-bold">{count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, email, telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-48 h-9 text-xs"><SelectValue placeholder="Motivo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todos os motivos</SelectItem>
            <SelectItem value="DADOS INCORRETOS" className="text-xs">Dados Incorretos</SelectItem>
            <SelectItem value="DESISTIU" className="text-xs">Desistiu</SelectItem>
            <SelectItem value="PAROU DE RESPONDER" className="text-xs">Parou de Responder</SelectItem>
            <SelectItem value="PREÇO CONTRATO" className="text-xs">Preço Contrato</SelectItem>
            <SelectItem value="SEM CONTATO" className="text-xs">Sem Contato</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-xs w-36" />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-xs w-36" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Empresa</TableHead>
              <TableHead className="text-xs">Contato</TableHead>
              <TableHead className="text-xs">Telefone</TableHead>
              <TableHead className="text-xs">Origem</TableHead>
              <TableHead className="text-xs">Valor MRR</TableHead>
              <TableHead className="text-xs">Motivo</TableHead>
              <TableHead className="text-xs">Vendedor</TableHead>
              <TableHead className="text-xs">Data Perda</TableHead>
              {canRescue && <TableHead className="text-xs text-center">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={canRescue ? 9 : 8} className="text-center text-xs text-muted-foreground py-8">Nenhum lead descartado encontrado</TableCell></TableRow>
            )}
            {filtered.map(l => {
              const reason = l.lost_reason?.split(":")[0]?.trim() || "—";
              return (
                <TableRow key={l.id}>
                  <TableCell className="text-xs font-medium">{l.company_name}</TableCell>
                  <TableCell className="text-xs">{l.contact_name || "—"}</TableCell>
                  <TableCell className="text-xs">{l.phone || "—"}</TableCell>
                  <TableCell className="text-xs">{l.source || "—"}</TableCell>
                  <TableCell className="text-xs">{formatCurrency(l.value_mrr || 0)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                      {LOST_REASONS_MAP[reason] || reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{l.created_by_name || "—"}</TableCell>
                  <TableCell className="text-xs">{l.updated_at ? formatDate(l.updated_at) : "—"}</TableCell>
                  {canRescue && (
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRescueLead(l)}>
                              <RotateCcw className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">Resgatar lead</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {rescueLead && (
        <RescueLeadDialog
          open={!!rescueLead}
          onOpenChange={(open) => { if (!open) setRescueLead(null); }}
          lead={rescueLead}
          onRescued={() => { setRescueLead(null); fetchLeads(); }}
        />
      )}
    </div>
  );
}
