import { useState, useMemo, useCallback, useEffect } from "react";
import {
  FileSpreadsheet, Download, Filter, Loader2, Search, ShieldAlert,
  Users, TrendingUp, DollarSign, BarChart3, CalendarDays, ArrowUpRight,
  ArrowDownRight, FileText, Sparkles, Bot, Brain, PieChart, Activity,
  Building2, Zap, Clock, Target,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
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
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { usePermissions } from "@/hooks/usePermissions";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";

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
  workspace_id: string | null;
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

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
];

const PAGE_SIZE = 50;

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
  const { workspaces } = useWorkspaceContext();
  const servidorId = useActiveCompanyId();

  const canViewClients = hasPermission("visualizar_relatorio_clientes");
  const canExportClients = hasPermission("exportar_relatorio_clientes");
  const canViewCrm = hasPermission("visualizar_relatorio_crm");
  const canExportCrm = hasPermission("exportar_relatorio_crm");

  const [activeTab, setActiveTab] = useState(() => canViewClients ? "clientes" : canViewCrm ? "crm" : "inteligencia");

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [cpfFilter, setCpfFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState("");
  const [produtoFilter, setProdutoFilter] = useState("");
  const [showCompare, setShowCompare] = useState(false);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);

  // Data
  const [clientData, setClientData] = useState<ClientRow[]>([]);
  const [crmData, setCrmData] = useState<CrmRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [page, setPage] = useState(0);

  // Comparison
  const [prevClientData, setPrevClientData] = useState<ClientRow[]>([]);
  const [prevCrmData, setPrevCrmData] = useState<CrmRow[]>([]);

  // AI
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const applyQuick = (key: string) => {
    const [f, t] = getQuickRange(key);
    setDateFrom(f);
    setDateTo(t);
  };

  const fetchClientData = async (from?: string, to?: string) => {
    if (!servidorId) return [];
    let query = supabase.from("crm_client_registrations")
      .select("id, nome_completo, cpf, client_status, plano_contratado, valor_mensal, cidade, created_at, created_by_name, data_adesao, servidor_id")
      .eq("servidor_id", servidorId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to + "T23:59:59");
    const { data } = await query.order("created_at", { ascending: false }).limit(2000);
    return (data || []) as ClientRow[];
  };

  const fetchCrmData = async (from?: string, to?: string) => {
    if (!servidorId) return [];
    let query = supabase.from("crm_leads")
      .select("id, company_name, contact_name, stage, lead_status, value_mrr, value_ps, source, created_at, created_by_name, updated_at, servidor_id, workspace_id")
      .eq("servidor_id", servidorId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to + "T23:59:59");
    if (selectedWorkspaceIds.length > 0) {
      query = query.in("workspace_id", selectedWorkspaceIds);
    }
    const { data } = await query.order("created_at", { ascending: false }).limit(2000);
    return (data || []) as CrmRow[];
  };

  const generateAiAnalysis = async (
    curKpis: Record<string, number>,
    prevKpis: Record<string, number>,
    type: string,
    from: string,
    to: string
  ) => {
    setAiLoading(true);
    setAiAnalysis("");
    try {
      const [pf, pt] = getPreviousPeriod(from, to);
      const { data, error } = await supabase.functions.invoke("report-ai-analysis", {
        body: {
          currentKpis: curKpis,
          previousKpis: prevKpis,
          reportType: type,
          periodLabel: `${new Date(from).toLocaleDateString("pt-BR")} a ${new Date(to).toLocaleDateString("pt-BR")}`,
          previousPeriodLabel: `${new Date(pf).toLocaleDateString("pt-BR")} a ${new Date(pt).toLocaleDateString("pt-BR")}`,
        },
      });
      if (error) throw error;
      setAiAnalysis(data.analysis || "Erro ao gerar análise.");
    } catch (e: any) {
      console.error("AI analysis error:", e);
      setAiAnalysis("Não foi possível gerar a análise comparativa. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!servidorId) {
      toast.error("Nenhum tenant selecionado");
      return;
    }
    setLoading(true);
    setPage(0);
    setAiAnalysis("");
    try {
      if ((activeTab === "clientes" || activeTab === "inteligencia") && canViewClients) {
        const data = await fetchClientData(dateFrom || undefined, dateTo || undefined);
        setClientData(data);
        if (showCompare && dateFrom && dateTo) {
          const [pf, pt] = getPreviousPeriod(dateFrom, dateTo);
          setPrevClientData(await fetchClientData(pf, pt));
        } else { setPrevClientData([]); }
      }
      if ((activeTab === "crm" || activeTab === "inteligencia") && canViewCrm) {
        const data = await fetchCrmData(dateFrom || undefined, dateTo || undefined);
        setCrmData(data);
        if (showCompare && dateFrom && dateTo) {
          const [pf, pt] = getPreviousPeriod(dateFrom, dateTo);
          setPrevCrmData(await fetchCrmData(pf, pt));
        } else { setPrevCrmData([]); }
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
    const inadimplentes = filteredClients.filter(c => c.client_status === "inadimplente").length;
    const receita = filteredClients.reduce((s, c) => s + (c.valor_mensal || 0), 0);
    const ticket = ativos > 0 ? receita / ativos : 0;
    return { total, ativos, inadimplentes, receita, ticket };
  }, [filteredClients]);

  const crmKpis = useMemo(() => {
    const total = filteredCrm.length;
    const ganhos = filteredCrm.filter(c => c.stage === "won").length;
    const perdas = filteredCrm.filter(c => c.stage === "lost").length;
    const abertos = total - ganhos - perdas;
    const receita = filteredCrm.filter(c => c.stage === "won").reduce((s, c) => s + c.value_mrr, 0);
    const ticket = ganhos > 0 ? receita / ganhos : 0;
    const conversao = (ganhos + perdas) > 0 ? (ganhos / (ganhos + perdas)) * 100 : 0;
    return { total, ganhos, perdas, abertos, receita, ticket, conversao };
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

  // Chart data
  const stageDistribution = useMemo(() => {
    if (!generated) return [];
    const counts: Record<string, number> = {};
    filteredCrm.forEach(r => {
      const label = stageLabels[r.stage] || r.stage;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredCrm, generated]);

  const clientStatusDistribution = useMemo(() => {
    if (!generated) return [];
    const counts: Record<string, number> = {};
    filteredClients.forEach(r => {
      const label = clientStatusLabels[r.client_status]?.label || r.client_status;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredClients, generated]);

  const monthlyEvolution = useMemo(() => {
    if (!generated) return [];
    const data = activeTab === "crm" || activeTab === "inteligencia" ? filteredCrm : filteredClients;
    const months: Record<string, { total: number; value: number }> = {};
    data.forEach((r: any) => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { total: 0, value: 0 };
      months[key].total += 1;
      months[key].value += r.value_mrr || r.valor_mensal || 0;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        total: d.total,
        valor: d.value,
      }));
  }, [filteredCrm, filteredClients, generated, activeTab]);

  const workspacePerformance = useMemo(() => {
    if (!generated || filteredCrm.length === 0) return [];
    const wsMap: Record<string, { name: string; ganhos: number; perdas: number; total: number; receita: number }> = {};
    filteredCrm.forEach(r => {
      const wsId = r.workspace_id || "sem_workspace";
      if (!wsMap[wsId]) {
        const ws = workspaces.find(w => w.id === wsId);
        wsMap[wsId] = { name: ws?.name || "Sem workspace", ganhos: 0, perdas: 0, total: 0, receita: 0 };
      }
      wsMap[wsId].total += 1;
      if (r.stage === "won") { wsMap[wsId].ganhos += 1; wsMap[wsId].receita += r.value_mrr; }
      if (r.stage === "lost") wsMap[wsId].perdas += 1;
    });
    return Object.values(wsMap).sort((a, b) => b.receita - a.receita);
  }, [filteredCrm, generated, workspaces]);

  const sellerPerformance = useMemo(() => {
    if (!generated || filteredCrm.length === 0) return [];
    const map: Record<string, { name: string; ganhos: number; perdas: number; receita: number }> = {};
    filteredCrm.forEach(r => {
      const key = r.created_by_name || "Sem vendedor";
      if (!map[key]) map[key] = { name: key, ganhos: 0, perdas: 0, receita: 0 };
      if (r.stage === "won") { map[key].ganhos += 1; map[key].receita += r.value_mrr; }
      if (r.stage === "lost") map[key].perdas += 1;
    });
    return Object.values(map).sort((a, b) => b.receita - a.receita);
  }, [filteredCrm, generated]);

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
    const fileName = `AccordInsights_${sheetName}_${dateStr}.${ext}`;

    if (format === "csv") {
      XLSX.writeFile(wb, fileName, { bookType: "csv" });
    } else {
      XLSX.writeFile(wb, fileName);
    }
    toast.success("Relatório exportado!");
  }, [activeTab, filteredClients, filteredCrm, currentData, canExportClients, canExportCrm]);

  const handleWorkspaceToggle = (wsId: string) => {
    setSelectedWorkspaceIds(prev =>
      prev.includes(wsId) ? prev.filter(id => id !== wsId) : [...prev, wsId]
    );
  };

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

  const KpiCard = ({ title, value, icon: Icon, prev, format = "number", accent }: {
    title: string; value: number; icon: any; prev?: number; format?: "number" | "currency" | "percent"; accent?: string;
  }) => {
    const change = prev !== undefined ? pctChange(value, prev) : null;
    return (
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className={`p-1.5 rounded-lg ${accent || "bg-primary/10"}`}>
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium">{title}</span>
            </div>
            {change !== null && (
              <Badge variant={change >= 0 ? "default" : "destructive"} className="text-[10px] gap-0.5 px-1.5 py-0">
                {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(change).toFixed(1)}%
              </Badge>
            )}
          </div>
          <p className="text-xl font-bold text-foreground mt-1.5">
            {format === "currency"
              ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              : format === "percent"
              ? `${value.toFixed(1)}%`
              : value.toLocaleString("pt-BR")}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Accord Insights</h1>
              <p className="text-muted-foreground text-sm">Centro de Inteligência e Análise</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setGenerated(false); setPage(0); }}>
        <TabsList className="bg-muted/50">
          {canViewClients && (
            <TabsTrigger value="clientes" className="gap-2 data-[state=active]:bg-background">
              <Users className="h-4 w-4" /> Base de Clientes
            </TabsTrigger>
          )}
          {canViewCrm && (
            <TabsTrigger value="crm" className="gap-2 data-[state=active]:bg-background">
              <TrendingUp className="h-4 w-4" /> CRM / Workspaces
            </TabsTrigger>
          )}
          {(canViewClients || canViewCrm) && (
            <TabsTrigger value="inteligencia" className="gap-2 data-[state=active]:bg-background">
              <Sparkles className="h-4 w-4" /> Inteligência
            </TabsTrigger>
          )}
        </TabsList>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr] mt-6">
          {/* Filters Panel */}
          <Card className="h-fit border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4 text-primary" /> Filtros
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

              {/* Workspace filter */}
              {(activeTab === "crm" || activeTab === "inteligencia") && workspaces.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Workspace
                  </Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto rounded-md border border-border/50 p-2">
                    <button
                      className={`w-full text-left text-xs px-2 py-1 rounded ${selectedWorkspaceIds.length === 0 ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
                      onClick={() => setSelectedWorkspaceIds([])}
                    >
                      Todos os workspaces
                    </button>
                    {workspaces.map(ws => (
                      <button
                        key={ws.id}
                        className={`w-full text-left text-xs px-2 py-1 rounded flex items-center gap-2 ${selectedWorkspaceIds.includes(ws.id) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
                        onClick={() => handleWorkspaceToggle(ws.id)}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ws.color }} />
                        {ws.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="compare" checked={showCompare} onChange={e => setShowCompare(e.target.checked)}
                  className="rounded border-border" />
                <Label htmlFor="compare" className="text-xs cursor-pointer">Comparar com período anterior</Label>
              </div>

              <Button onClick={handleGenerate} className="w-full gap-2 text-xs" disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
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
            {/* ===== CLIENTES TAB ===== */}
            <TabsContent value="clientes" className="mt-0 space-y-4">
              {generated && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <KpiCard title="Total Clientes" value={clientKpis.total} icon={Users}
                    prev={showCompare ? prevClientKpis.total : undefined} />
                  <KpiCard title="Ativos" value={clientKpis.ativos} icon={Users} accent="bg-emerald-500/10" />
                  <KpiCard title="Inadimplentes" value={clientKpis.inadimplentes} icon={ShieldAlert} accent="bg-red-500/10" />
                  <KpiCard title="Receita MRR" value={clientKpis.receita} icon={DollarSign} format="currency"
                    prev={showCompare ? prevClientKpis.receita : undefined} />
                  <KpiCard title="Ticket Médio" value={clientKpis.ticket} icon={BarChart3} format="currency" />
                </div>
              )}

              {/* Charts */}
              {generated && filteredClients.length > 0 && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Evolução Mensal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={monthlyEvolution}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Cadastros" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" /> Distribuição por Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <RechartsPie>
                          <Pie data={clientStatusDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {clientStatusDistribution.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {renderTable()}
            </TabsContent>

            {/* ===== CRM TAB ===== */}
            <TabsContent value="crm" className="mt-0 space-y-4">
              {generated && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <KpiCard title="Total Leads" value={crmKpis.total} icon={TrendingUp}
                    prev={showCompare ? prevCrmKpis.total : undefined} />
                  <KpiCard title="Vendas Ganhas" value={crmKpis.ganhos} icon={Target} accent="bg-emerald-500/10"
                    prev={showCompare ? prevCrmKpis.ganhos : undefined} />
                  <KpiCard title="Conversão" value={crmKpis.conversao} icon={Zap} format="percent" />
                  <KpiCard title="Receita" value={crmKpis.receita} icon={DollarSign} format="currency"
                    prev={showCompare ? prevCrmKpis.receita : undefined} />
                  <KpiCard title="Ticket Médio" value={crmKpis.ticket} icon={BarChart3} format="currency" />
                </div>
              )}

              {/* Charts */}
              {generated && filteredCrm.length > 0 && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Evolução Mensal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthlyEvolution}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Leads" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" /> Distribuição por Etapa</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <RechartsPie>
                          <Pie data={stageDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {stageDistribution.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* AI Comparison */}
              {generated && showCompare && dateFrom && dateTo && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Análise Comparativa com IA
                      </CardTitle>
                      <Button size="sm" variant={aiAnalysis ? "outline" : "default"} className="text-xs gap-1.5" disabled={aiLoading}
                        onClick={() => {
                          const curKpis = { total_leads: crmKpis.total, vendas_ganhas: crmKpis.ganhos, receita: crmKpis.receita, ticket_medio: crmKpis.ticket, conversao: crmKpis.conversao };
                          const prevKpisData = { total_leads: prevCrmKpis.total, vendas_ganhas: prevCrmKpis.ganhos, receita: prevCrmKpis.receita };
                          generateAiAnalysis(curKpis, prevKpisData, "crm", dateFrom, dateTo);
                        }}>
                        {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                        {aiAnalysis ? "Regenerar" : "Gerar Análise"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {aiLoading ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Gerando análise comparativa...</p>
                      </div>
                    ) : aiAnalysis ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">Clique em "Gerar Análise" para obter insights comparativos com IA</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {renderTable()}
            </TabsContent>

            {/* ===== INTELLIGENCE TAB ===== */}
            <TabsContent value="inteligencia" className="mt-0 space-y-4">
              {!generated ? (
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Centro de Inteligência</p>
                      <p className="text-xs mt-1">Configure os filtros e gere o relatório para visualizar insights avançados</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Top KPIs */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <KpiCard title="Total Clientes" value={clientKpis.total} icon={Users} />
                    <KpiCard title="Total Leads" value={crmKpis.total} icon={TrendingUp} />
                    <KpiCard title="Receita Total" value={clientKpis.receita + crmKpis.receita} icon={DollarSign} format="currency" />
                    <KpiCard title="Conversão Média" value={crmKpis.conversao} icon={Target} format="percent" />
                    <KpiCard title="Ticket Médio" value={crmKpis.ticket || clientKpis.ticket} icon={BarChart3} format="currency" />
                  </div>

                  {/* Workspace Performance */}
                  {workspacePerformance.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Performance por Workspace</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={workspacePerformance} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                            <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                            <Legend />
                            <Bar dataKey="ganhos" fill="#10B981" name="Ganhos" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="perdas" fill="#EF4444" name="Perdas" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Seller Performance */}
                  {sellerPerformance.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Desempenho por Vendedor</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg border overflow-auto max-h-[40vh]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Vendedor</TableHead>
                                <TableHead className="text-xs text-center">Ganhos</TableHead>
                                <TableHead className="text-xs text-center">Perdas</TableHead>
                                <TableHead className="text-xs text-center">Conversão</TableHead>
                                <TableHead className="text-xs text-right">Receita</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sellerPerformance.map((s, i) => {
                                const total = s.ganhos + s.perdas;
                                const conv = total > 0 ? (s.ganhos / total * 100) : 0;
                                return (
                                  <TableRow key={i}>
                                    <TableCell className="text-xs font-medium">{s.name}</TableCell>
                                    <TableCell className="text-xs text-center text-emerald-600 font-semibold">{s.ganhos}</TableCell>
                                    <TableCell className="text-xs text-center text-red-500">{s.perdas}</TableCell>
                                    <TableCell className="text-xs text-center">
                                      <Badge variant="outline" className="text-[10px]">{conv.toFixed(1)}%</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-medium">
                                      {s.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI Analysis */}
                  {dateFrom && dateTo && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Análise Inteligente com IA
                          </CardTitle>
                          <Button size="sm" variant={aiAnalysis ? "outline" : "default"} className="text-xs gap-1.5" disabled={aiLoading}
                            onClick={() => {
                              const curKpis = { total_clientes: clientKpis.total, ativos: clientKpis.ativos, receita_mrr: clientKpis.receita, total_leads: crmKpis.total, vendas_ganhas: crmKpis.ganhos, receita_crm: crmKpis.receita, conversao: crmKpis.conversao };
                              generateAiAnalysis(curKpis, {}, "inteligencia", dateFrom, dateTo);
                            }}>
                            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                            {aiAnalysis ? "Regenerar" : "Gerar Análise"}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {aiLoading ? (
                          <div className="flex flex-col items-center justify-center py-8 gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-xs text-muted-foreground">Gerando análise inteligente...</p>
                          </div>
                        ) : aiAnalysis ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">Clique em "Gerar Análise" para obter insights inteligentes sobre seus dados</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );

  function renderTable() {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">
              {activeTab === "clientes" ? "Relatório de Clientes" : "Relatório CRM / Workspaces"}
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
    );
  }
}
