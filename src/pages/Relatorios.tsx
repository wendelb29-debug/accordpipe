import { useState, useMemo, useCallback } from "react";
import {
  FileSpreadsheet, Download, Loader2, Search, ShieldAlert,
  Users, TrendingUp, DollarSign, BarChart3, CalendarDays, ArrowUpRight,
  ArrowDownRight, FileText, Sparkles, Bot, Brain, PieChart, Activity,
  Building2, Zap, Clock, Target, ChevronDown, Trophy, Medal,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
  standby: "Standby", novo_lead: "Novo Lead", em_contato: "Em Contato",
  proposta_enviada: "Proposta Enviada", negociacao: "Negociação", won: "Ganho", lost: "Perdido",
};

const clientStatusLabels: Record<string, { label: string; cls: string }> = {
  ativo: { label: "Ativo", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  pendente: { label: "Pendente", cls: "bg-amber-500/10 text-amber-600 border-amber-200" },
  inadimplente: { label: "Inadimplente", cls: "bg-red-500/10 text-red-600 border-red-200" },
  cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
};

const CHART_COLORS = [
  "hsl(var(--primary))", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
];

const PAGE_SIZE = 50;

function getQuickRange(key: string): [string, string] {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "30d") { const f = new Date(now); f.setDate(f.getDate() - 30); return [fmt(f), fmt(now)]; }
  if (key === "month") return [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), fmt(now)];
  if (key === "year") return [fmt(new Date(now.getFullYear(), 0, 1)), fmt(now)];
  return ["", ""];
}

function getPreviousPeriod(from: string, to: string): [string, string] {
  const f = new Date(from); const t = new Date(to);
  const diff = t.getTime() - f.getTime();
  const prevTo = new Date(f.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - diff);
  return [prevFrom.toISOString().slice(0, 10), prevTo.toISOString().slice(0, 10)];
}

// --- KPI Card Component ---
function KpiCard({ title, value, icon: Icon, prev, format = "number", accent }: {
  title: string; value: number; icon: any; prev?: number; format?: "number" | "currency" | "percent"; accent?: string;
}) {
  const pctChange = (cur: number, p: number) => {
    if (p === 0) return cur > 0 ? 100 : 0;
    return ((cur - p) / p) * 100;
  };
  const change = prev !== undefined ? pctChange(value, prev) : null;
  const isPositive = change !== null && change >= 0;

  const formatted = format === "currency"
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : format === "percent"
    ? `${value.toFixed(1)}%`
    : value.toLocaleString("pt-BR");

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card p-5 shadow-sm border border-border/40 transition-all duration-300 hover:shadow-lg hover:border-border/80 hover:-translate-y-0.5">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{formatted}</p>
          {change !== null && (
            <div className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 ${isPositive ? "text-emerald-600 bg-emerald-500/10" : "text-red-500 bg-red-500/10"}`}>
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}% vs anterior
            </div>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${accent || "bg-primary/10"}`}>
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

// --- Skeleton Loader ---
function InsightsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// --- Empty State ---
function EmptyState({ onGenerate, loading }: { onGenerate: () => void; loading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-in fade-in duration-500">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
          <Brain className="h-10 w-10 text-primary" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Centro de Inteligência</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        Configure os filtros acima e gere o relatório para visualizar insights, KPIs e análises avançadas do seu negócio.
      </p>
      <Button onClick={onGenerate} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        Gerar Análise
      </Button>
    </div>
  );
}

// --- Main Component ---
export default function Relatorios() {
  const { profile } = useAuth();
  const { hasPermission } = usePermissions();
  const { workspaces } = useWorkspaceContext();
  const servidorId = useActiveCompanyId();

  const canViewClients = hasPermission("visualizar_relatorio_clientes");
  const canExportClients = hasPermission("exportar_relatorio_clientes");
  const canViewCrm = hasPermission("visualizar_relatorio_crm");
  const canExportCrm = hasPermission("exportar_relatorio_crm");

  const [activeTab, setActiveTab] = useState(() => canViewClients ? "clientes" : canViewCrm ? "crm" : "performance");

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendedorFilter, setVendedorFilter] = useState("");
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

  const applyQuick = (key: string) => { const [f, t] = getQuickRange(key); setDateFrom(f); setDateTo(t); };

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
    if (selectedWorkspaceIds.length > 0) query = query.in("workspace_id", selectedWorkspaceIds);
    const { data } = await query.order("created_at", { ascending: false }).limit(2000);
    return (data || []) as CrmRow[];
  };

  const generateAiAnalysis = async (curKpis: Record<string, number>, prevKpis: Record<string, number>, type: string, from: string, to: string) => {
    setAiLoading(true); setAiAnalysis("");
    try {
      const [pf, pt] = getPreviousPeriod(from, to);
      const { data, error } = await supabase.functions.invoke("report-ai-analysis", {
        body: { currentKpis: curKpis, previousKpis: prevKpis, reportType: type,
          periodLabel: `${new Date(from).toLocaleDateString("pt-BR")} a ${new Date(to).toLocaleDateString("pt-BR")}`,
          previousPeriodLabel: `${new Date(pf).toLocaleDateString("pt-BR")} a ${new Date(pt).toLocaleDateString("pt-BR")}`,
        },
      });
      if (error) throw error;
      setAiAnalysis(data.analysis || "Erro ao gerar análise.");
    } catch { setAiAnalysis("Não foi possível gerar a análise. Tente novamente."); }
    finally { setAiLoading(false); }
  };

  const handleGenerate = async () => {
    if (!servidorId) { toast.error("Nenhum tenant selecionado"); return; }
    setLoading(true); setPage(0); setAiAnalysis("");
    try {
      const shouldFetchClients = (activeTab === "clientes" || activeTab === "performance") && canViewClients;
      const shouldFetchCrm = (activeTab === "crm" || activeTab === "performance") && canViewCrm;

      if (shouldFetchClients) {
        const data = await fetchClientData(dateFrom || undefined, dateTo || undefined);
        setClientData(data);
        if (dateFrom && dateTo) {
          const [pf, pt] = getPreviousPeriod(dateFrom, dateTo);
          setPrevClientData(await fetchClientData(pf, pt));
        } else setPrevClientData([]);
      }
      if (shouldFetchCrm) {
        const data = await fetchCrmData(dateFrom || undefined, dateTo || undefined);
        setCrmData(data);
        if (dateFrom && dateTo) {
          const [pf, pt] = getPreviousPeriod(dateFrom, dateTo);
          setPrevCrmData(await fetchCrmData(pf, pt));
        } else setPrevCrmData([]);
      }
      setGenerated(true);
      toast.success("Relatório gerado com sucesso!");
    } catch { toast.error("Erro ao gerar relatório"); }
    finally { setLoading(false); }
  };

  // Filtered data
  const filteredClients = useMemo(() => {
    if (!generated) return [];
    return clientData.filter(r => {
      if (statusFilter !== "all" && r.client_status !== statusFilter) return false;
      if (searchFilter && !(r.nome_completo || "").toLowerCase().includes(searchFilter.toLowerCase()) &&
          !(r.cpf || "").replace(/\D/g, "").includes(searchFilter.replace(/\D/g, ""))) return false;
      if (vendedorFilter && !(r.created_by_name || "").toLowerCase().includes(vendedorFilter.toLowerCase())) return false;
      return true;
    });
  }, [clientData, generated, statusFilter, searchFilter, vendedorFilter]);

  const filteredCrm = useMemo(() => {
    if (!generated) return [];
    return crmData.filter(r => {
      if (statusFilter !== "all") {
        if (statusFilter === "won" && r.stage !== "won") return false;
        if (statusFilter === "lost" && r.stage !== "lost") return false;
        if (statusFilter === "open" && (r.stage === "won" || r.stage === "lost")) return false;
      }
      if (searchFilter && !(r.company_name || "").toLowerCase().includes(searchFilter.toLowerCase()) &&
          !(r.contact_name || "").toLowerCase().includes(searchFilter.toLowerCase())) return false;
      if (vendedorFilter && !(r.created_by_name || "").toLowerCase().includes(vendedorFilter.toLowerCase())) return false;
      return true;
    });
  }, [crmData, generated, statusFilter, searchFilter, vendedorFilter]);

  const currentData = activeTab === "clientes" ? filteredClients : filteredCrm;
  const pagedData = currentData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(currentData.length / PAGE_SIZE);

  // KPIs
  const pctChange = (cur: number, prev: number) => { if (prev === 0) return cur > 0 ? 100 : 0; return ((cur - prev) / prev) * 100; };

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
    const receita = filteredCrm.filter(c => c.stage === "won").reduce((s, c) => s + c.value_mrr, 0);
    const ticket = ganhos > 0 ? receita / ganhos : 0;
    const conversao = (ganhos + perdas) > 0 ? (ganhos / (ganhos + perdas)) * 100 : 0;
    return { total, ganhos, perdas, receita, ticket, conversao };
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

  // Charts
  const stageDistribution = useMemo(() => {
    if (!generated) return [];
    const counts: Record<string, number> = {};
    filteredCrm.forEach(r => { const l = stageLabels[r.stage] || r.stage; counts[l] = (counts[l] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredCrm, generated]);

  const clientStatusDistribution = useMemo(() => {
    if (!generated) return [];
    const counts: Record<string, number> = {};
    filteredClients.forEach(r => { const l = clientStatusLabels[r.client_status]?.label || r.client_status; counts[l] = (counts[l] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredClients, generated]);

  const monthlyEvolution = useMemo(() => {
    if (!generated) return [];
    const data = activeTab === "crm" || activeTab === "performance" ? filteredCrm : filteredClients;
    const months: Record<string, { total: number; value: number }> = {};
    data.forEach((r: any) => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { total: 0, value: 0 };
      months[key].total += 1;
      months[key].value += r.value_mrr || r.valor_mensal || 0;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, d]) => ({
      month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      total: d.total, valor: d.value,
    }));
  }, [filteredCrm, filteredClients, generated, activeTab]);

  const workspacePerformance = useMemo(() => {
    if (!generated || filteredCrm.length === 0) return [];
    const wsMap: Record<string, { name: string; ganhos: number; perdas: number; total: number; receita: number; color: string }> = {};
    filteredCrm.forEach(r => {
      const wsId = r.workspace_id || "sem_workspace";
      if (!wsMap[wsId]) {
        const ws = workspaces.find(w => w.id === wsId);
        wsMap[wsId] = { name: ws?.name || "Sem workspace", ganhos: 0, perdas: 0, total: 0, receita: 0, color: ws?.color || "hsl(var(--primary))" };
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
        "Nome": r.nome_completo || "-", "CPF": r.cpf || "-",
        "Status": clientStatusLabels[r.client_status]?.label || r.client_status,
        "Cidade": r.cidade || "-", "Produto": r.plano_contratado || "-",
        "Valor Mensal": r.valor_mensal || 0, "Vendedor": r.created_by_name || "-",
        "Data Cadastro": new Date(r.created_at).toLocaleDateString("pt-BR"),
      }));
    } else {
      rows = (filteredCrm as CrmRow[]).map(r => ({
        "Lead/Cliente": r.company_name || r.contact_name || "-", "Etapa": stageLabels[r.stage] || r.stage,
        "Status": r.lead_status, "Valor MRR": r.value_mrr, "Valor PS": r.value_ps,
        "Vendedor": r.created_by_name || "-", "Data Entrada": new Date(r.created_at).toLocaleDateString("pt-BR"),
        "Última Atualização": new Date(r.updated_at).toLocaleDateString("pt-BR"),
      }));
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetName = activeTab === "clientes" ? "Clientes" : "CRM";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    XLSX.writeFile(wb, `AccordInsights_${sheetName}_${dateStr}.${format === "csv" ? "csv" : "xlsx"}`, format === "csv" ? { bookType: "csv" } : undefined);
    toast.success("Relatório exportado!");
  }, [activeTab, filteredClients, filteredCrm, currentData, canExportClients, canExportCrm]);

  const handleWorkspaceToggle = (wsId: string) => {
    setSelectedWorkspaceIds(prev => prev.includes(wsId) ? prev.filter(id => id !== wsId) : [...prev, wsId]);
  };

  if (!canViewClients && !canViewCrm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in">
        <ShieldAlert className="h-16 w-16 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-semibold text-foreground">Acesso Restrito</h2>
        <p className="text-muted-foreground text-center max-w-md">Seu perfil não possui permissão para acessar os relatórios.</p>
      </div>
    );
  }

  const statusOptions = activeTab === "clientes"
    ? [{ value: "all", label: "Todos" }, { value: "ativo", label: "Ativo" }, { value: "pendente", label: "Pendente" }, { value: "inadimplente", label: "Inadimplente" }, { value: "cancelado", label: "Cancelado" }]
    : [{ value: "all", label: "Todos" }, { value: "won", label: "Ganho" }, { value: "lost", label: "Perdido" }, { value: "open", label: "Em andamento" }];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Accord Insights</h1>
            <p className="text-sm text-muted-foreground">Centro de Inteligência e Performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={!generated || currentData.length === 0} onClick={() => handleExport("xlsx")}>
            <Download className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={!generated || currentData.length === 0} onClick={() => handleExport("csv")}>
            <FileText className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* ===== HORIZONTAL FILTER BAR ===== */}
      <Card className="border-border/40">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Quick period */}
            <div className="flex items-center gap-1.5">
              {[{ key: "30d", label: "30d" }, { key: "month", label: "Mês" }, { key: "year", label: "Ano" }].map(q => (
                <Button key={q.key} variant="outline" size="sm" className="text-[11px] h-8 px-2.5" onClick={() => applyQuick(q.key)}>
                  <CalendarDays className="h-3 w-3 mr-1" /> {q.label}
                </Button>
              ))}
            </div>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-[130px]" />
              <span className="text-xs text-muted-foreground">a</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-[130px]" />
            </div>

            {/* Workspace Multi-select */}
            {(activeTab === "crm" || activeTab === "performance") && workspaces.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 min-w-[140px] justify-between">
                    <Building2 className="h-3 w-3" />
                    {selectedWorkspaceIds.length === 0 ? "Todos Workspaces" : `${selectedWorkspaceIds.length} workspace(s)`}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <button className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                    onClick={() => setSelectedWorkspaceIds([])}>
                    <div className="w-3 h-3 rounded border border-border flex items-center justify-center">
                      {selectedWorkspaceIds.length === 0 && <div className="w-2 h-2 rounded-sm bg-primary" />}
                    </div>
                    Todos os workspaces
                  </button>
                  <div className="my-1 border-t border-border/50" />
                  {workspaces.map(ws => (
                    <button key={ws.id} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                      onClick={() => handleWorkspaceToggle(ws.id)}>
                      <Checkbox checked={selectedWorkspaceIds.includes(ws.id)} className="h-3.5 w-3.5" />
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ws.color }} />
                      <span className="truncate">{ws.name}</span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
                className="h-8 text-xs pl-8 w-[180px]" />
            </div>

            {/* Vendedor */}
            <Input placeholder="Vendedor..." value={vendedorFilter} onChange={e => setVendedorFilter(e.target.value)}
              className="h-8 text-xs w-[140px]" />

            {/* Generate */}
            <Button onClick={handleGenerate} size="sm" className="h-8 gap-1.5 text-xs px-4" disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Gerar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== TABS ===== */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setGenerated(false); setPage(0); }}>
        <TabsList className="bg-muted/40 border border-border/30 p-1">
          {canViewClients && (
            <TabsTrigger value="clientes" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="h-3.5 w-3.5" /> Base de Clientes
            </TabsTrigger>
          )}
          {canViewCrm && (
            <TabsTrigger value="crm" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <TrendingUp className="h-3.5 w-3.5" /> CRM / Workspaces
            </TabsTrigger>
          )}
          {(canViewClients || canViewCrm) && (
            <TabsTrigger value="performance" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Trophy className="h-3.5 w-3.5" /> Performance
            </TabsTrigger>
          )}
          {(canViewClients || canViewCrm) && (
            <TabsTrigger value="financeiro" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <DollarSign className="h-3.5 w-3.5" /> Financeiro
            </TabsTrigger>
          )}
        </TabsList>

        {/* ===== CLIENTES TAB ===== */}
        <TabsContent value="clientes" className="mt-6 space-y-6">
          {loading ? <InsightsSkeleton /> : !generated ? (
            <EmptyState onGenerate={handleGenerate} loading={loading} />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard title="Total Clientes" value={clientKpis.total} icon={Users} prev={prevClientKpis.total || undefined} />
                <KpiCard title="Ativos" value={clientKpis.ativos} icon={Users} accent="bg-emerald-500/10" />
                <KpiCard title="Inadimplentes" value={clientKpis.inadimplentes} icon={ShieldAlert} accent="bg-red-500/10" />
                <KpiCard title="Receita MRR" value={clientKpis.receita} icon={DollarSign} format="currency" prev={prevClientKpis.receita || undefined} />
                <KpiCard title="Ticket Médio" value={clientKpis.ticket} icon={BarChart3} format="currency" />
              </div>

              {filteredClients.length > 0 && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card className="border-border/40">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Evolução Mensal</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={monthlyEvolution}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} name="Cadastros" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="border-border/40">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" /> Distribuição por Status</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <RechartsPie>
                          <Pie data={clientStatusDistribution} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value" paddingAngle={2}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {clientStatusDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {renderDataTable("clientes")}
            </>
          )}
        </TabsContent>

        {/* ===== CRM TAB ===== */}
        <TabsContent value="crm" className="mt-6 space-y-6">
          {loading ? <InsightsSkeleton /> : !generated ? (
            <EmptyState onGenerate={handleGenerate} loading={loading} />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard title="Total Leads" value={crmKpis.total} icon={TrendingUp} prev={prevCrmKpis.total || undefined} />
                <KpiCard title="Vendas Ganhas" value={crmKpis.ganhos} icon={Target} accent="bg-emerald-500/10" prev={prevCrmKpis.ganhos || undefined} />
                <KpiCard title="Conversão" value={crmKpis.conversao} icon={Zap} format="percent" />
                <KpiCard title="Receita" value={crmKpis.receita} icon={DollarSign} format="currency" prev={prevCrmKpis.receita || undefined} />
                <KpiCard title="Ticket Médio" value={crmKpis.ticket} icon={BarChart3} format="currency" />
              </div>

              {filteredCrm.length > 0 && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card className="border-border/40">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Evolução Mensal</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={monthlyEvolution}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Leads" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="border-border/40">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" /> Distribuição por Etapa</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <RechartsPie>
                          <Pie data={stageDistribution} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value" paddingAngle={2}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {stageDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* AI Analysis */}
              {dateFrom && dateTo && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Análise com IA</CardTitle>
                      <Button size="sm" variant={aiAnalysis ? "outline" : "default"} className="text-xs gap-1.5 h-7" disabled={aiLoading}
                        onClick={() => {
                          generateAiAnalysis(
                            { total_leads: crmKpis.total, vendas_ganhas: crmKpis.ganhos, receita: crmKpis.receita, ticket_medio: crmKpis.ticket, conversao: crmKpis.conversao },
                            { total_leads: prevCrmKpis.total, vendas_ganhas: prevCrmKpis.ganhos, receita: prevCrmKpis.receita },
                            "crm", dateFrom, dateTo
                          );
                        }}>
                        {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                        {aiAnalysis ? "Regenerar" : "Gerar Análise"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {aiLoading ? (
                      <div className="flex flex-col items-center py-8 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Gerando análise inteligente...</p>
                      </div>
                    ) : aiAnalysis ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Bot className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">Clique em "Gerar Análise" para insights automáticos</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {renderDataTable("crm")}
            </>
          )}
        </TabsContent>

        {/* ===== PERFORMANCE TAB ===== */}
        <TabsContent value="performance" className="mt-6 space-y-6">
          {loading ? <InsightsSkeleton /> : !generated ? (
            <EmptyState onGenerate={handleGenerate} loading={loading} />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard title="Total Clientes" value={clientKpis.total} icon={Users} />
                <KpiCard title="Total Leads" value={crmKpis.total} icon={TrendingUp} />
                <KpiCard title="Receita Total" value={clientKpis.receita + crmKpis.receita} icon={DollarSign} format="currency" />
                <KpiCard title="Conversão" value={crmKpis.conversao} icon={Target} format="percent" />
                <KpiCard title="Ticket Médio" value={crmKpis.ticket || clientKpis.ticket} icon={BarChart3} format="currency" />
              </div>

              {/* Workspace Ranking */}
              {workspacePerformance.length > 0 && (
                <Card className="border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Ranking por Workspace</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(200, workspacePerformance.length * 50)}>
                      <BarChart data={workspacePerformance} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={130} />
                        <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend />
                        <Bar dataKey="ganhos" fill="#10B981" name="Ganhos" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="perdas" fill="#EF4444" name="Perdas" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Seller Ranking */}
              {sellerPerformance.length > 0 && (
                <Card className="border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Medal className="h-4 w-4 text-primary" /> Ranking por Vendedor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl border border-border/40 overflow-auto max-h-[45vh]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-[11px] font-semibold">#</TableHead>
                            <TableHead className="text-[11px] font-semibold">Vendedor</TableHead>
                            <TableHead className="text-[11px] font-semibold text-center">Ganhos</TableHead>
                            <TableHead className="text-[11px] font-semibold text-center">Perdas</TableHead>
                            <TableHead className="text-[11px] font-semibold text-center">Conversão</TableHead>
                            <TableHead className="text-[11px] font-semibold text-right">Receita</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sellerPerformance.map((s, i) => {
                            const total = s.ganhos + s.perdas;
                            const conv = total > 0 ? (s.ganhos / total * 100) : 0;
                            return (
                              <TableRow key={i} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="text-xs font-bold text-muted-foreground w-8">
                                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                                </TableCell>
                                <TableCell className="text-xs font-medium">{s.name}</TableCell>
                                <TableCell className="text-xs text-center"><span className="text-emerald-600 font-semibold">{s.ganhos}</span></TableCell>
                                <TableCell className="text-xs text-center"><span className="text-red-500">{s.perdas}</span></TableCell>
                                <TableCell className="text-xs text-center">
                                  <Badge variant="outline" className="text-[10px] font-medium">{conv.toFixed(1)}%</Badge>
                                </TableCell>
                                <TableCell className="text-xs text-right font-semibold">
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
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Análise Inteligente</CardTitle>
                      <Button size="sm" variant={aiAnalysis ? "outline" : "default"} className="text-xs gap-1.5 h-7" disabled={aiLoading}
                        onClick={() => {
                          generateAiAnalysis(
                            { total_clientes: clientKpis.total, ativos: clientKpis.ativos, receita_mrr: clientKpis.receita, total_leads: crmKpis.total, vendas_ganhas: crmKpis.ganhos, receita_crm: crmKpis.receita, conversao: crmKpis.conversao },
                            {}, "inteligencia", dateFrom, dateTo
                          );
                        }}>
                        {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                        {aiAnalysis ? "Regenerar" : "Gerar Análise"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {aiLoading ? (
                      <div className="flex flex-col items-center py-8 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Gerando análise inteligente...</p>
                      </div>
                    ) : aiAnalysis ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Bot className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">Clique para gerar insights inteligentes</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ===== FINANCEIRO TAB ===== */}
        <TabsContent value="financeiro" className="mt-6 space-y-6">
          {loading ? <InsightsSkeleton /> : !generated ? (
            <EmptyState onGenerate={handleGenerate} loading={loading} />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="MRR Total" value={clientKpis.receita} icon={DollarSign} format="currency" prev={prevClientKpis.receita || undefined} />
                <KpiCard title="Receita CRM" value={crmKpis.receita} icon={TrendingUp} format="currency" prev={prevCrmKpis.receita || undefined} />
                <KpiCard title="Ticket Médio" value={crmKpis.ticket || clientKpis.ticket} icon={BarChart3} format="currency" />
                <KpiCard title="Clientes Ativos" value={clientKpis.ativos} icon={Users} />
              </div>

              {monthlyEvolution.length > 0 && (
                <Card className="border-border/40">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Evolução de Receita</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyEvolution}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), "Valor"]} />
                        <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} name="Receita" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  function renderDataTable(type: "clientes" | "crm") {
    const data = type === "clientes" ? filteredClients : filteredCrm;
    const paged = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const pages = Math.ceil(data.length / PAGE_SIZE);

    if (data.length === 0) {
      return (
        <Card className="border-border/40">
          <CardContent className="py-16">
            <div className="flex flex-col items-center text-muted-foreground">
              <Search className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">Nenhum registro encontrado</p>
              <p className="text-xs mt-1">Tente ajustar os filtros</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">{type === "clientes" ? "Base de Clientes" : "Leads CRM"}</CardTitle>
          <Badge variant="outline" className="text-[10px] gap-1"><FileSpreadsheet className="h-3 w-3" /> {data.length}</Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/40 overflow-auto max-h-[55vh]">
            {type === "clientes" ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[11px] font-semibold">Nome</TableHead>
                    <TableHead className="text-[11px] font-semibold">CPF</TableHead>
                    <TableHead className="text-[11px] font-semibold">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold">Cidade</TableHead>
                    <TableHead className="text-[11px] font-semibold">Produto</TableHead>
                    <TableHead className="text-[11px] font-semibold text-right">Valor</TableHead>
                    <TableHead className="text-[11px] font-semibold">Vendedor</TableHead>
                    <TableHead className="text-[11px] font-semibold">Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paged as ClientRow[]).map(r => {
                    const st = clientStatusLabels[r.client_status] || clientStatusLabels.pendente;
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-xs font-medium">{r.nome_completo || "-"}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{r.cpf || "-"}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] ${st.cls}`}>{st.label}</Badge></TableCell>
                        <TableCell className="text-xs">{r.cidade || "-"}</TableCell>
                        <TableCell className="text-xs">{r.plano_contratado || "-"}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{(r.valor_mensal || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                        <TableCell className="text-xs">{r.created_by_name || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[11px] font-semibold">Lead / Cliente</TableHead>
                    <TableHead className="text-[11px] font-semibold">Etapa</TableHead>
                    <TableHead className="text-[11px] font-semibold">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold text-right">MRR</TableHead>
                    <TableHead className="text-[11px] font-semibold text-right">PS</TableHead>
                    <TableHead className="text-[11px] font-semibold">Vendedor</TableHead>
                    <TableHead className="text-[11px] font-semibold">Entrada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paged as CrmRow[]).map(r => (
                    <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs font-medium">{r.contact_name || r.company_name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{stageLabels[r.stage] || r.stage}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={r.stage === "won" ? "default" : r.stage === "lost" ? "destructive" : "outline"} className="text-[10px]">
                          {r.stage === "won" ? "Ganho" : r.stage === "lost" ? "Perdido" : "Aberto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">{r.value_mrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                      <TableCell className="text-xs text-right">{r.value_ps.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                      <TableCell className="text-xs">{r.created_by_name || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between pt-3">
              <span className="text-[11px] text-muted-foreground">Página {page + 1} de {pages}</span>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="text-xs h-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" className="text-xs h-7" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}
