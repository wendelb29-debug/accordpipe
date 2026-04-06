import { useState, useMemo, useCallback, useEffect } from "react";
import {
  FileSpreadsheet, Download, Filter, Loader2, Search, ShieldAlert,
  Users, TrendingUp, DollarSign, BarChart3, CalendarDays, ArrowUpRight,
  ArrowDownRight, FileText, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// --- Types ---
interface ClientRow {
  id: string;
  nome_completo: string | null;
  cpf: string | null;
  client_status: string;
  plano_contratado: string | null;
  valor_mensal: number | null;
  cidade: string | null;
  created_at: string;
  created_by_name: string | null;
  data_adesao: string | null;
  servidor_id: string;
}

interface CrmRow {
  id: string;
  company_name: string;
  contact_name: string | null;
  stage: string;
  lead_status: string;
  value_mrr: number;
  value_ps: number;
  source: string;
  created_at: string;
  created_by_name: string | null;
  updated_at: string;
  servidor_id: string;
}

const stageLabels: Record<string, string> = {
  standby: "Standby",
  novo_lead: "Novo Lead",
  em_contato: "Em Contato",
  proposta_enviada: "Proposta Enviada",
  negociacao: "Negociação",
  won: "Ganho",
  lost: "Perdido",
};

const clientStatusLabels: Record<string, { label: string; cls: string }> = {
  ativo: { label: "Ativo", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  pendente: { label: "Pendente", cls: "bg-amber-500/10 text-amber-600 border-amber-200" },
  inadimplente: { label: "Inadimplente", cls: "bg-red-500/10 text-red-600 border-red-200" },
  cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
};

const PAGE_SIZE = 50;

// --- Quick date helpers ---
function getQuickRange(key: string): [string, string] {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return [fmt(from), fmt(now)];
  }
  if (key === "month") {
    return [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), fmt(now)];
  }
  if (key === "year") {
    return [fmt(new Date(now.getFullYear(), 0, 1)), fmt(now)];
  }
  return ["", ""];
}

function getPreviousPeriod(from: string, to: string): [string, string] {
  const f = new Date(from);
  const t = new Date(to);
  const diff = t.getTime() - f.getTime();
  const prevTo = new Date(f.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - diff);
  return [prevFrom.toISOString().slice(0, 10), prevTo.toISOString().slice(0, 10)];
}

export default function Relatorios() {
  const { profile, isMaster } = useAuth();
  const { hasPermission } = usePermissions();

  const canViewClients = hasPermission("visualizar_relatorio_clientes");
  const canExportClients = hasPermission("exportar_relatorio_clientes");
  const canViewCrm = hasPermission("visualizar_relatorio_crm");
  const canExportCrm = hasPermission("exportar_relatorio_crm");

  const [activeTab, setActiveTab] = useState(() => canViewClients ? "clientes" : "crm");

  // Shared filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [cpfFilter, setCpfFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState("");
  const [produtoFilter, setProdutoFilter] = useState("");
  const [showCompare, setShowCompare] = useState(false);

  // Data
  const [clientData, setClientData] = useState<ClientRow[]>([]);
  const [crmData, setCrmData] = useState<CrmRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [page, setPage] = useState(0);

  // Comparison data
  const [prevClientData, setPrevClientData] = useState<ClientRow[]>([]);
  const [prevCrmData, setPrevCrmData] = useState<CrmRow[]>([]);

  const servidorId = isMaster ? profile?.company_id : profile?.company_id;

  const applyQuick = (key: string) => {
    const [f, t] = getQuickRange(key);
    setDateFrom(f);
    setDateTo(t);
  };

  const fetchClientData = async (from?: string, to?: string) => {
    let query = supabase.from("crm_client_registrations")
      .select("id, nome_completo, cpf, client_status, plano_contratado, valor_mensal, cidade, created_at, created_by_name, data_adesao, servidor_id");
    if (servidorId) query = query.eq("servidor_id", servidorId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to + "T23:59:59");
    const { data } = await query.order("created_at", { ascending: false }).limit(2000);
    return (data || []) as ClientRow[];
  };

  const fetchCrmData = async (from?: string, to?: string) => {
    let query = supabase.from("crm_leads")
      .select("id, company_name, contact_name, stage, lead_status, value_mrr, value_ps, source, created_at, created_by_name, updated_at, servidor_id");
    if (servidorId) query = query.eq("servidor_id", servidorId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to + "T23:59:59");
    const { data } = await query.order("created_at", { ascending: false }).limit(2000);
    return (data || []) as CrmRow[];
  };

  const handleGenerate = async () => {
    setLoading(true);
    setPage(0);
    try {
      if (activeTab === "clientes" && canViewClients) {
        const data = await fetchClientData(dateFrom || undefined, dateTo || undefined);
        setClientData(data);
        if (showCompare && dateFrom && dateTo) {
          const [pf, pt] = getPreviousPeriod(dateFrom, dateTo);
          const prev = await fetchClientData(pf, pt);
          setPrevClientData(prev);
        } else {
          setPrevClientData([]);
        }
      }
      if (activeTab === "crm" && canViewCrm) {
        const data = await fetchCrmData(dateFrom || undefined, dateTo || undefined);
        setCrmData(data);
        if (showCompare && dateFrom && dateTo) {
          const [pf, pt] = getPreviousPeriod(dateFrom, dateTo);
          const prev = await fetchCrmData(pf, pt);
          setPrevCrmData(prev);
        } else {
          setPrevCrmData([]);
        }
      }
      setGenerated(true);
      toast.success("Relatório gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  // Filtered data
  const filteredClients = useMemo(() => {
    if (!generated) return [];
    return clientData.filter(r => {
      if (statusFilter !== "all" && r.client_status !== statusFilter) return false;
      if (nameFilter && !(r.nome_completo || "").toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (cpfFilter && !(r.cpf || "").replace(/\D/g, "").includes(cpfFilter.replace(/\D/g, ""))) return false;
      if (cityFilter && !(r.cidade || "").toLowerCase().includes(cityFilter.toLowerCase())) return false;
      if (vendedorFilter && !(r.created_by_name || "").toLowerCase().includes(vendedorFilter.toLowerCase())) return false;
      if (produtoFilter && !(r.plano_contratado || "").toLowerCase().includes(produtoFilter.toLowerCase())) return false;
      return true;
    });
  }, [clientData, generated, statusFilter, nameFilter, cpfFilter, cityFilter, vendedorFilter, produtoFilter]);

  const filteredCrm = useMemo(() => {
    if (!generated) return [];
    return crmData.filter(r => {
      if (statusFilter !== "all") {
        if (statusFilter === "won" && r.stage !== "won") return false;
        if (statusFilter === "lost" && r.stage !== "lost") return false;
        if (statusFilter === "open" && (r.stage === "won" || r.stage === "lost")) return false;
      }
      if (nameFilter && !(r.company_name || "").toLowerCase().includes(nameFilter.toLowerCase()) &&
          !(r.contact_name || "").toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (vendedorFilter && !(r.created_by_name || "").toLowerCase().includes(vendedorFilter.toLowerCase())) return false;
      return true;
    });
  }, [crmData, generated, statusFilter, nameFilter, vendedorFilter]);

  const currentData = activeTab === "clientes" ? filteredClients : filteredCrm;
  const pagedData = currentData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(currentData.length / PAGE_SIZE);

  // KPIs
  const clientKpis = useMemo(() => {
    const total = filteredClients.length;
    const ativos = filteredClients.filter(c => c.client_status === "ativo").length;
    const receita = filteredClients.reduce((s, c) => s + (c.valor_mensal || 0), 0);
    const ticket = total > 0 ? receita / total : 0;
    return { total, ativos, receita, ticket };
  }, [filteredClients]);

  const crmKpis = useMemo(() => {
    const total = filteredCrm.length;
    const ganhos = filteredCrm.filter(c => c.stage === "won").length;
    const receita = filteredCrm.filter(c => c.stage === "won").reduce((s, c) => s + c.value_mrr, 0);
    const ticket = ganhos > 0 ? receita / ganhos : 0;
    return { total, ganhos, receita, ticket };
  }, [filteredCrm]);

  const prevClientKpis = useMemo(() => {
    const total = prevClientData.length;
    const receita = prevClientData.reduce((s, c) => s + (c.valor_mensal || 0), 0);
    return { total, receita };
  }, [prevClientData]);

  const prevCrmKpis = useMemo(() => {
    const total = prevCrmData.length;
    const ganhos = prevCrmData.filter(c => c.stage === "won").length;
    const receita = prevCrmData.filter(c => c.stage === "won").reduce((s, c) => s + c.value_mrr, 0);
    return { total, ganhos, receita };
  }, [prevCrmData]);

  const pctChange = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  };

  // Export
  const handleExport = useCallback((format: "xlsx" | "csv") => {
    const canExport = activeTab === "clientes" ? canExportClients : canExportCrm;
    if (!canExport) { toast.error("Sem permissão para exportar"); return; }
    if (currentData.length === 0) { toast.error("Nenhum dado para exportar"); return; }

    let rows: Record<string, any>[];
    if (activeTab === "clientes") {
      rows = (filteredClients as ClientRow[]).map(r => ({
        "Nome": r.nome_completo || "-",
        "CPF": r.cpf || "-",
        "Status": clientStatusLabels[r.client_status]?.label || r.client_status,
        "Cidade": r.cidade || "-",
        "Produto": r.plano_contratado || "-",
        "Valor Mensal": r.valor_mensal || 0,
        "Vendedor": r.created_by_name || "-",
        "Data Cadastro": new Date(r.created_at).toLocaleDateString("pt-BR"),
      }));
    } else {
      rows = (filteredCrm as CrmRow[]).map(r => ({
        "Lead/Cliente": r.company_name || r.contact_name || "-",
        "Etapa": stageLabels[r.stage] || r.stage,
        "Status": r.lead_status,
        "Valor MRR": r.value_mrr,
        "Valor PS": r.value_ps,
        "Vendedor": r.created_by_name || "-",
        "Data Entrada": new Date(r.created_at).toLocaleDateString("pt-BR"),
        "Última Atualização": new Date(r.updated_at).toLocaleDateString("pt-BR"),
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetName = activeTab === "clientes" ? "Clientes" : "CRM";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    const ext = format === "csv" ? "csv" : "xlsx";
    const fileName = `Relatorio_${sheetName}_${dateStr}.${ext}`;

    if (format === "csv") {
      XLSX.writeFile(wb, fileName, { bookType: "csv" });
    } else {
      XLSX.writeFile(wb, fileName);
    }
    toast.success("Relatório exportado!");
  }, [activeTab, filteredClients, filteredCrm, currentData, canExportClients, canExportCrm]);

  if (!canViewClients && !canViewCrm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <ShieldAlert className="h-16 w-16 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-semibold text-foreground">Acesso Restrito</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Seu perfil não possui permissão para acessar os relatórios.
        </p>
      </div>
    );
  }

  const KpiCard = ({ title, value, icon: Icon, prev, format = "number" }: {
    title: string; value: number; icon: any; prev?: number; format?: "number" | "currency";
  }) => {
    const change = prev !== undefined ? pctChange(value, prev) : null;
    return (
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{title}</span>
            </div>
            {change !== null && (
              <Badge variant={change >= 0 ? "default" : "destructive"} className="text-[10px] gap-0.5 px-1.5 py-0">
                {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(change).toFixed(1)}%
              </Badge>
            )}
          </div>
          <p className="text-xl font-bold text-foreground mt-1">
            {format === "currency"
              ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              : value.toLocaleString("pt-BR")}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">Extraia relatórios detalhados com filtros avançados</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setGenerated(false); setPage(0); }}>
        <TabsList>
          {canViewClients && (
            <TabsTrigger value="clientes" className="gap-2">
              <Users className="h-4 w-4" /> Base de Clientes
            </TabsTrigger>
          )}
          {canViewCrm && (
            <TabsTrigger value="crm" className="gap-2">
              <TrendingUp className="h-4 w-4" /> CRM / Vendas
            </TabsTrigger>
          )}
        </TabsList>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr] mt-6">
          {/* Filters Panel */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" /> Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Quick filters */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { key: "30d", label: "30 dias" },
                  { key: "month", label: "Este mês" },
                  { key: "year", label: "Este ano" },
                ].map(q => (
                  <Button key={q.key} variant="outline" size="sm" className="text-xs h-7 px-2.5"
                    onClick={() => applyQuick(q.key)}>
                    <CalendarDays className="h-3 w-3 mr-1" /> {q.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Período</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input placeholder="Buscar..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} className="h-8 text-xs" />
              </div>

              {activeTab === "clientes" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">CPF/CNPJ</Label>
                    <Input placeholder="000.000.000-00" value={cpfFilter} onChange={e => setCpfFilter(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="inadimplente">Inadimplente</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cidade</Label>
                    <Input placeholder="Filtrar..." value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Produto</Label>
                    <Input placeholder="Filtrar..." value={produtoFilter} onChange={e => setProdutoFilter(e.target.value)} className="h-8 text-xs" />
                  </div>
                </>
              )}

              {activeTab === "crm" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="won">Ganho</SelectItem>
                      <SelectItem value="lost">Perdido</SelectItem>
                      <SelectItem value="open">Em andamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Vendedor</Label>
                <Input placeholder="Nome do vendedor..." value={vendedorFilter} onChange={e => setVendedorFilter(e.target.value)} className="h-8 text-xs" />
              </div>

              {/* Compare toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="compare" checked={showCompare} onChange={e => setShowCompare(e.target.checked)}
                  className="rounded border-border" />
                <Label htmlFor="compare" className="text-xs cursor-pointer">Comparar com período anterior</Label>
              </div>

              <Button onClick={handleGenerate} className="w-full gap-2 text-xs" disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Gerar Relatório
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs gap-1"
                  disabled={!generated || currentData.length === 0}
                  onClick={() => handleExport("xlsx")}>
                  <Download className="h-3 w-3" /> Excel
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs gap-1"
                  disabled={!generated || currentData.length === 0}
                  onClick={() => handleExport("csv")}>
                  <FileText className="h-3 w-3" /> CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            {/* KPI Cards */}
            {generated && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {activeTab === "clientes" ? (
                  <>
                    <KpiCard title="Total Clientes" value={clientKpis.total} icon={Users}
                      prev={showCompare ? prevClientKpis.total : undefined} />
                    <KpiCard title="Ativos" value={clientKpis.ativos} icon={Users} />
                    <KpiCard title="Receita MRR" value={clientKpis.receita} icon={DollarSign} format="currency"
                      prev={showCompare ? prevClientKpis.receita : undefined} />
                    <KpiCard title="Ticket Médio" value={clientKpis.ticket} icon={BarChart3} format="currency" />
                  </>
                ) : (
                  <>
                    <KpiCard title="Total Leads" value={crmKpis.total} icon={TrendingUp}
                      prev={showCompare ? prevCrmKpis.total : undefined} />
                    <KpiCard title="Vendas Ganhas" value={crmKpis.ganhos} icon={Users}
                      prev={showCompare ? prevCrmKpis.ganhos : undefined} />
                    <KpiCard title="Receita" value={crmKpis.receita} icon={DollarSign} format="currency"
                      prev={showCompare ? prevCrmKpis.receita : undefined} />
                    <KpiCard title="Ticket Médio" value={crmKpis.ticket} icon={BarChart3} format="currency" />
                  </>
                )}
              </div>
            )}

            {/* Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">
                    {activeTab === "clientes" ? "Relatório de Clientes" : "Relatório CRM / Vendas"}
                  </CardTitle>
                  <CardDescription>
                    {generated ? `${currentData.length} registro(s)` : "Configure os filtros e gere o relatório"}
                  </CardDescription>
                </div>
                {generated && currentData.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <FileSpreadsheet className="h-3 w-3" /> {currentData.length}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !generated ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Configure os filtros e clique em "Gerar Relatório"</p>
                  </div>
                ) : currentData.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum registro encontrado</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border overflow-auto max-h-[55vh]">
                      {activeTab === "clientes" ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Nome</TableHead>
                              <TableHead className="text-xs">CPF</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Cidade</TableHead>
                              <TableHead className="text-xs">Produto</TableHead>
                              <TableHead className="text-xs text-right">Valor</TableHead>
                              <TableHead className="text-xs">Vendedor</TableHead>
                              <TableHead className="text-xs">Cadastro</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(pagedData as ClientRow[]).map(r => {
                              const st = clientStatusLabels[r.client_status] || clientStatusLabels.pendente;
                              return (
                                <TableRow key={r.id}>
                                  <TableCell className="text-xs font-medium">{r.nome_completo || "-"}</TableCell>
                                  <TableCell className="text-xs font-mono">{r.cpf || "-"}</TableCell>
                                  <TableCell><Badge variant="outline" className={`text-[10px] ${st.cls}`}>{st.label}</Badge></TableCell>
                                  <TableCell className="text-xs">{r.cidade || "-"}</TableCell>
                                  <TableCell className="text-xs">{r.plano_contratado || "-"}</TableCell>
                                  <TableCell className="text-xs text-right">
                                    {(r.valor_mensal || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </TableCell>
                                  <TableCell className="text-xs">{r.created_by_name || "-"}</TableCell>
                                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Lead / Cliente</TableHead>
                              <TableHead className="text-xs">Etapa</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs text-right">MRR</TableHead>
                              <TableHead className="text-xs text-right">PS</TableHead>
                              <TableHead className="text-xs">Vendedor</TableHead>
                              <TableHead className="text-xs">Entrada</TableHead>
                              <TableHead className="text-xs">Atualização</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(pagedData as CrmRow[]).map(r => (
                              <TableRow key={r.id}>
                                <TableCell className="text-xs font-medium">{r.contact_name || r.company_name}</TableCell>
                                <TableCell><Badge variant="secondary" className="text-[10px]">{stageLabels[r.stage] || r.stage}</Badge></TableCell>
                                <TableCell>
                                  <Badge variant={r.stage === "won" ? "default" : r.stage === "lost" ? "destructive" : "outline"} className="text-[10px]">
                                    {r.stage === "won" ? "Ganho" : r.stage === "lost" ? "Perdido" : "Aberto"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  {r.value_mrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  {r.value_ps.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </TableCell>
                                <TableCell className="text-xs">{r.created_by_name || "-"}</TableCell>
                                <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                                <TableCell className="text-xs">{new Date(r.updated_at).toLocaleDateString("pt-BR")}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-3">
                        <span className="text-xs text-muted-foreground">
                          Página {page + 1} de {totalPages}
                        </span>
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" className="text-xs h-7"
                            disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                          <Button variant="outline" size="sm" className="text-xs h-7"
                            disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
