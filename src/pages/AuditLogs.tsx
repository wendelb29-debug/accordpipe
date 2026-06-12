import { useState, useEffect, useMemo } from "react";
import { format, formatDistanceToNowStrict, isToday, isYesterday, differenceInDays, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search, ChevronLeft, ChevronRight, Eye, Shield, Calendar, Download, X,
  ArrowUp, AlertTriangle, Activity, Users, Monitor, Globe, Target,
  ChevronDown, FileText, Layers, Sparkles, BarChart3,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AuditExportFileCard } from "@/components/audit/AuditExportFileCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  create_user: "Criar Usuário", edit_user: "Editar Usuário", delete_user: "Excluir Usuário",
  change_role: "Alterar Perfil", change_permissions: "Alterar Permissões", change_data_scope: "Alterar Escopo",
  create_workspace: "Criar Workspace", edit_workspace: "Editar Workspace", delete_workspace: "Excluir Workspace",
  create_lead: "Criar Lead", edit_lead: "Editar Lead", delete_lead: "Excluir Lead",
  change_lead_owner: "Alterar Dono", mark_lead_won: "Marcar Ganho", mark_lead_lost: "Marcar Perdido",
  move_lead_stage: "Mover Etapa", create_proposal: "Criar Proposta", edit_proposal: "Editar Proposta",
  delete_proposal: "Excluir Proposta", apply_discount: "Aplicar Desconto", change_final_price: "Alterar Valor",
  create_contract: "Criar Contrato", send_signature: "Enviar Assinatura", cancel_signature: "Cancelar Assinatura",
  settle_payment: "Liquidar Pagamento", create_transaction: "Criar Cobrança", edit_transaction: "Editar Cobrança",
  delete_transaction: "Excluir Cobrança", change_integration: "Alterar Integração",
  change_tenant_limits: "Alterar Limites", change_billing_plan: "Alterar Plano", manage_tenant: "Gestão Tenant",
};

const TARGET_LABELS: Record<string, string> = {
  user: "Usuário", role: "Perfil", permission: "Permissão", workspace: "Workspace",
  lead: "Lead", proposal: "Proposta", contract: "Contrato", transaction: "Cobrança",
  integration: "Integração", tenant: "Tenant", document: "Documento", company: "Empresa",
};

// Maps action verb prefixes/keywords to coloured tag styles
const ACTION_KIND: Record<string, { label: string; cls: string }> = {
  create:           { label: "CRIOU",      cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  edit:             { label: "EDITOU",     cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  update:           { label: "EDITOU",     cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  view:             { label: "VISUALIZOU", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  export:           { label: "EXPORTOU",   cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  delete:           { label: "EXCLUIU",    cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  move:             { label: "MOVEU",      cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
  permission:       { label: "PERMISSÃO", cls: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  change_role:      { label: "PERMISSÃO", cls: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  change_permissions:{label: "PERMISSÃO", cls: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  login:            { label: "LOGIN",      cls: "bg-muted text-muted-foreground" },
  logout:           { label: "LOGOUT",     cls: "bg-muted text-muted-foreground" },
  mark_lead_won:    { label: "GANHO",      cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  mark_lead_lost:   { label: "PERDIDO",    cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  settle_payment:   { label: "LIQUIDOU",   cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  send_signature:   { label: "ENVIOU",     cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  cancel_signature: { label: "CANCELOU",   cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  apply_discount:   { label: "DESCONTO",   cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
};

function getActionStyle(action: string) {
  if (ACTION_KIND[action]) return ACTION_KIND[action];
  const prefix = action.split("_")[0];
  if (ACTION_KIND[prefix]) return ACTION_KIND[prefix];
  if (action.includes("permission") || action.includes("role")) return ACTION_KIND.permission;
  return { label: action.toUpperCase().replace(/_/g, " ").slice(0, 12), cls: "bg-muted text-muted-foreground" };
}

const SENSITIVE_PREFIXES = ["delete_", "export", "change_permissions", "change_role", "change_data_scope"];
function isSensitive(action: string) {
  return SENSITIVE_PREFIXES.some(p => action.startsWith(p) || action === p);
}

const USER_PALETTE = [
  "from-violet-500 to-violet-700",
  "from-emerald-500 to-emerald-700",
  "from-blue-500 to-blue-700",
  "from-pink-500 to-pink-700",
  "from-amber-500 to-amber-700",
  "from-cyan-500 to-cyan-700",
  "from-fuchsia-500 to-fuchsia-700",
  "from-indigo-500 to-indigo-700",
];
function userColor(userId: string | null) {
  if (!userId) return USER_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return USER_PALETTE[hash % USER_PALETTE.length];
}
function initials(name: string | null) {
  if (!name) return "··";
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

function maskIp(ip: string | null) {
  if (!ip) return "—";
  return ip.replace(/^(\d+\.)\d+\.\d+(\.\d+)$/, "$1xxx.xxx$2");
}
function parseUserAgent(ua: string | null | undefined) {
  if (!ua) return "—";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS · Mobile";
  if (/Android/.test(ua)) return "Android · Mobile";
  if (/Edg/.test(ua)) return "Edge · " + (/Mac/.test(ua) ? "macOS" : "Windows");
  if (/Chrome/.test(ua)) return "Chrome · " + (/Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Windows");
  if (/Firefox/.test(ua)) return "Firefox";
  if (/Safari/.test(ua)) return "Safari · macOS";
  return "Browser";
}

function formatDayLabel(date: Date): string {
  if (isToday(date)) return `HOJE · ${format(date, "dd 'DE' MMMM", { locale: ptBR }).toUpperCase()}`;
  if (isYesterday(date)) return `ONTEM · ${format(date, "dd 'DE' MMMM", { locale: ptBR }).toUpperCase()}`;
  return format(date, "dd 'DE' MMMM · EEEE", { locale: ptBR }).toUpperCase();
}

function relativeTime(iso: string) {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  if (mins < 60 * 24) return `há ${Math.floor(mins / 60)}h`;
  if (mins < 60 * 24 * 2) return "ontem";
  return format(d, "dd/MM");
}

function buildSparkline(values: number[]): { area: string; line: string } {
  if (values.length === 0) return { area: "", line: "" };
  const W = 200, H = 42;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const pts = values.map((v, i) => [i * step, H - (v / max) * (H - 4) - 2] as [number, number]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return { area, line };
}

const PAGE_SIZE = 25;

interface FilterPillProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  count?: number | null;
  onClick?: () => void;
}
function FilterPill({ icon: Icon, label, active, count, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 px-3 rounded-lg text-[11.5px] font-semibold inline-flex items-center gap-1.5 border transition",
        active
          ? "bg-primary/15 border-primary/35 text-primary"
          : "bg-card border-border text-foreground/85 hover:bg-muted"
      )}
    >
      <Icon className="w-3 h-3" />
      <span className="truncate max-w-[140px]">{label}</span>
      {count != null && (
        <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold bg-primary text-primary-foreground">
          {count.toLocaleString("pt-BR")}
        </span>
      )}
      <ChevronDown className="w-3 h-3 opacity-40 ml-0.5" />
    </button>
  );
}

interface WidgetCardProps { title: string; children: React.ReactNode; icon?: React.ElementType }
function WidgetCard({ title, children, icon: Icon }: WidgetCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-3">
        {Icon && <Icon className="w-3 h-3 text-primary" />}
        <div className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">{title}</div>
      </div>
      {children}
    </div>
  );
}

export default function AuditLogs() {
  const { role, profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [pagePathFilter, setPagePathFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Stats data (last 30d)
  const [stats, setStats] = useState<AuditLog[]>([]);

  const hasAccess =
    profile?.is_master === true || role === "admin" || role === "ceo" || role === "master";

  useEffect(() => {
    if (hasAccess) fetchLogs();
  }, [page, actionFilter, targetFilter, userFilter, pagePathFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (hasAccess) fetchStats();
  }, [hasAccess]);

  const fetchStats = async () => {
    try {
      const since = subDays(new Date(), 30).toISOString();
      const { data } = await supabase
        .from("audit_logs")
        .select("id,user_id,user_name,action,target_type,details,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      setStats((data || []) as AuditLog[]);
    } catch (err) {
      console.error("stats fetch", err);
    }
  };

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
      if (userFilter !== "all") query = query.eq("user_id", userFilter);
      if (dateFrom) query = query.gte("created_at", dateFrom.toISOString());
      if (dateTo) {
        const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ─── Aggregations from stats ─────────────────────────────────────
  const todayCount = useMemo(
    () => stats.filter(l => isToday(new Date(l.created_at))).length,
    [stats]
  );

  const sensitiveToday = useMemo(() => {
    const today = stats.filter(l => isToday(new Date(l.created_at)));
    const exports = today.filter(l => l.action.startsWith("export")).length;
    const deletes = today.filter(l => l.action.startsWith("delete_")).length;
    const perms = today.filter(l => l.action.includes("permission") || l.action.includes("role")).length;
    return { total: exports + deletes + perms, exports, deletes, perms };
  }, [stats]);

  // 14-day sparkline series
  const dailySeries = useMemo(() => {
    const days: number[] = Array(14).fill(0);
    const start = startOfDay(subDays(new Date(), 13));
    stats.forEach(l => {
      const d = new Date(l.created_at);
      const diff = differenceInDays(startOfDay(d), start);
      if (diff >= 0 && diff < 14) days[diff]++;
    });
    return days;
  }, [stats]);

  const kpis = useMemo(() => {
    const total30 = stats.length;
    const users = new Set(stats.map(l => l.user_id)).size;
    const avg = Math.round(total30 / 30);
    const types = new Set(stats.map(l => l.action)).size;
    const half = stats.filter(l => new Date(l.created_at) >= subDays(new Date(), 15)).length;
    const prev = total30 - half;
    const delta = prev === 0 ? 100 : Math.round(((half - prev) / prev) * 100);
    return { total30, users, avg, types, delta };
  }, [stats]);

  const topPages = useMemo(() => {
    const m: Record<string, number> = {};
    stats.forEach(l => {
      const p = l.details?.page_path; if (p) m[p] = (m[p] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [stats]);

  const topUsers = useMemo(() => {
    const m: Record<string, { name: string; user_id: string; count: number }> = {};
    stats.forEach(l => {
      if (!l.user_id) return;
      if (!m[l.user_id]) m[l.user_id] = { name: l.user_name || "Sistema", user_id: l.user_id, count: 0 };
      m[l.user_id].count++;
    });
    return Object.values(m).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [stats]);

  const moduleStats = useMemo(() => {
    const m: Record<string, number> = {};
    stats.forEach(l => { m[l.target_type] = (m[l.target_type] || 0) + 1; });
    const total = Object.values(m).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([k, v]) => ({ key: k, label: TARGET_LABELS[k] || k, count: v, pct: Math.round((v / total) * 100) }));
  }, [stats]);

  const heatmap = useMemo(() => {
    // 4 weeks × 7 days grid (col = week, row = weekday)
    const grid: number[][] = Array.from({ length: 4 }, () => Array(7).fill(0));
    const start = startOfDay(subDays(new Date(), 27));
    stats.forEach(l => {
      const d = new Date(l.created_at);
      const diff = differenceInDays(startOfDay(d), start);
      if (diff < 0 || diff >= 28) return;
      const week = Math.floor(diff / 7);
      const day = diff % 7;
      grid[week][day]++;
    });
    const max = Math.max(1, ...grid.flat());
    return { grid, max };
  }, [stats]);

  // Grouped logs by day
  const groupedLogs = useMemo(() => {
    const groups: Record<string, AuditLog[]> = {};
    logs.forEach(l => {
      const key = format(new Date(l.created_at), "yyyy-MM-dd");
      (groups[key] = groups[key] || []).push(l);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [logs]);

  const sparkline = useMemo(() => buildSparkline(dailySeries), [dailySeries]);

  // ─── Handlers ───────────────────────────────────────────────────
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

  const clearFilters = () => {
    setSearch(""); setActionFilter("all"); setTargetFilter("all"); setUserFilter("all");
    setDateFrom(undefined); setDateTo(undefined); setPagePathFilter(null); setPage(0);
  };

  const uniqueUsers = useMemoTopUsers(stats);

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
    <div className="audit-page relative min-h-full">
      {/* Ambient background gradients */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(900px 600px at 90% 5%, hsl(var(--primary) / 0.10), transparent 60%),
            radial-gradient(700px 500px at 10% 95%, hsl(var(--primary) / 0.08), transparent 60%)
          `,
        }}
      />

      <div className="relative z-10 space-y-6 pb-8">
        {/* Breadcrumb */}
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          Accord
          <span className="opacity-50">/</span>
          Configurações
          <span className="opacity-50">/</span>
          <span className="text-primary">Audit Trail</span>
        </div>

        {/* Hero */}
        <div className="flex items-start gap-5">
          <div className="w-[54px] h-[54px] rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight leading-none mb-2">Audit Trail</h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Registro imutável de cada ação executada no tenant. Cada login, criação, edição, exclusão
              e exportação fica documentado para compliance e auditoria.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                {todayCount} EVENTOS HOJE
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exportingCsv} className="h-9 gap-1.5">
              <Download className="w-3.5 h-3.5" />
              {exportingCsv ? "Exportando..." : "Exportar CSV"}
            </Button>
          </div>
        </div>

        {/* Sensitive banner */}
        {sensitiveToday.total >= 3 && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/[.06] p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold text-red-600 dark:text-red-400 mb-0.5 tracking-tight">
                {sensitiveToday.total} ações sensíveis detectadas hoje
              </div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                {sensitiveToday.exports} exportações de base · {sensitiveToday.deletes} exclusões de alto valor · {sensitiveToday.perms} mudanças de permissão. Recomenda-se revisar.
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={Activity}
            label="Total de eventos · 30d"
            value={kpis.total30.toLocaleString("pt-BR")}
            delta={kpis.delta}
            sparkline={sparkline}
            keyId={1}
          />
          <KpiCard
            icon={Users}
            label="Usuários ativos · 30d"
            value={kpis.users.toLocaleString("pt-BR")}
            delta={null}
            sparkline={sparkline}
            keyId={2}
          />
          <KpiCard
            icon={BarChart3}
            label="Média diária"
            value={kpis.avg.toLocaleString("pt-BR")}
            delta={null}
            sparkline={sparkline}
            keyId={3}
          />
          <KpiCard
            icon={Layers}
            label="Tipos de ação"
            value={kpis.types.toString()}
            delta={null}
            sparkline={sparkline}
            keyId={4}
          />
        </div>

        {/* Page filter active strip */}
        {pagePathFilter && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border bg-primary/10 border-primary/30">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="bg-primary/20 text-primary text-[9.5px] font-extrabold uppercase tracking-[.1em]">
                FILTRO ATIVO · PÁGINA
              </Badge>
              <code className="font-mono text-primary text-[11px]">{pagePathFilter}</code>
            </div>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setPagePathFilter(null)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[220px] max-w-md flex items-center gap-2 h-10 px-3 rounded-xl bg-card border border-border focus-within:border-primary/50 transition">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(0), fetchLogs())}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              placeholder="Buscar por ação, usuário, ID..."
            />
          </div>

          {/* Period */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "h-9 px-3 rounded-lg text-[11.5px] font-semibold inline-flex items-center gap-1.5 border transition",
                (dateFrom || dateTo) ? "bg-primary/15 border-primary/35 text-primary" : "bg-card border-border text-foreground/85 hover:bg-muted"
              )}>
                <Calendar className="w-3 h-3" />
                <span>
                  {dateFrom || dateTo
                    ? `${dateFrom ? format(dateFrom, "dd/MM") : "—"} → ${dateTo ? format(dateTo, "dd/MM") : "—"}`
                    : "Últimos 30 dias"}
                </span>
                <ChevronDown className="w-3 h-3 opacity-40" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 space-y-2" align="start">
              <div className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">De</div>
              <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} />
              <div className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">Até</div>
              <CalendarComponent mode="single" selected={dateTo} onSelect={setDateTo} />
            </PopoverContent>
          </Popover>

          {/* Action */}
          <Popover>
            <PopoverTrigger asChild>
              <button>
                <FilterPill
                  icon={Target}
                  label={actionFilter === "all" ? "Todas ações" : ACTION_LABELS[actionFilter] || actionFilter}
                  active={actionFilter !== "all"}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-1 max-h-[320px] overflow-y-auto" align="start">
              <FilterListItem active={actionFilter === "all"} onClick={() => { setActionFilter("all"); setPage(0); }}>
                Todas ações
              </FilterListItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <FilterListItem key={k} active={actionFilter === k} onClick={() => { setActionFilter(k); setPage(0); }}>
                  {v}
                </FilterListItem>
              ))}
            </PopoverContent>
          </Popover>

          {/* Users */}
          <Popover>
            <PopoverTrigger asChild>
              <button>
                <FilterPill
                  icon={Users}
                  label={
                    userFilter === "all"
                      ? "Todos usuários"
                      : uniqueUsers.find(u => u.user_id === userFilter)?.name || "Usuário"
                  }
                  active={userFilter !== "all"}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-1 max-h-[320px] overflow-y-auto" align="start">
              <FilterListItem active={userFilter === "all"} onClick={() => { setUserFilter("all"); setPage(0); }}>
                Todos usuários
              </FilterListItem>
              {uniqueUsers.map(u => (
                <FilterListItem key={u.user_id} active={userFilter === u.user_id} onClick={() => { setUserFilter(u.user_id); setPage(0); }}>
                  {u.name}
                </FilterListItem>
              ))}
            </PopoverContent>
          </Popover>

          {/* Module */}
          <Popover>
            <PopoverTrigger asChild>
              <button>
                <FilterPill
                  icon={Monitor}
                  label={targetFilter === "all" ? "Todos módulos" : TARGET_LABELS[targetFilter] || targetFilter}
                  active={targetFilter !== "all"}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1 max-h-[320px] overflow-y-auto" align="start">
              <FilterListItem active={targetFilter === "all"} onClick={() => { setTargetFilter("all"); setPage(0); }}>
                Todos módulos
              </FilterListItem>
              {Object.entries(TARGET_LABELS).map(([k, v]) => (
                <FilterListItem key={k} active={targetFilter === k} onClick={() => { setTargetFilter(k); setPage(0); }}>
                  {v}
                </FilterListItem>
              ))}
            </PopoverContent>
          </Popover>

          {/* Pages */}
          <Popover>
            <PopoverTrigger asChild>
              <button>
                <FilterPill
                  icon={Globe}
                  label={pagePathFilter || "Todas páginas"}
                  active={!!pagePathFilter}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-1 max-h-[320px] overflow-y-auto" align="start">
              <FilterListItem active={!pagePathFilter} onClick={() => setPagePathFilter(null)}>
                Todas páginas
              </FilterListItem>
              {topPages.map(([p, c]) => (
                <FilterListItem key={p} active={pagePathFilter === p} onClick={() => setPagePathFilter(p)}>
                  <span className="font-mono text-[11px] truncate flex-1">{p}</span>
                  <span className="ml-2 text-[10px] font-mono text-muted-foreground">{c}</span>
                </FilterListItem>
              ))}
            </PopoverContent>
          </Popover>

          {(search || actionFilter !== "all" || targetFilter !== "all" || userFilter !== "all" || dateFrom || dateTo || pagePathFilter) && (
            <Button variant="ghost" size="sm" className="h-9 text-[11.5px]" onClick={clearFilters}>
              Limpar
            </Button>
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          {/* Timeline */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : logs.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <div className="text-sm font-semibold tracking-tight">Nenhum evento no período</div>
                <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros para ver outros registros.</p>
              </div>
            ) : (
              groupedLogs.map(([day, dayLogs]) => (
                <div key={day}>
                  <div className="flex items-center gap-3 px-5 py-3 bg-muted/30 border-b border-border/60">
                    <span className="text-[11px] font-extrabold uppercase tracking-[.1em]">
                      {formatDayLabel(new Date(day))}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground font-mono">
                      {dayLogs.length} evento{dayLogs.length > 1 ? "s" : ""}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {dayLogs.map(log => (
                    <LogRow
                      key={log.id}
                      log={log}
                      onClick={() => setSelectedLog(log)}
                      onFilterPage={setPagePathFilter}
                    />
                  ))}
                </div>
              ))
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 bg-muted/20">
                <p className="text-[11px] text-muted-foreground font-mono">{total.toLocaleString("pt-BR")} registros</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[11px] text-muted-foreground font-mono">{page + 1} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-8 w-8 p-0">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-3.5">
            {/* Páginas mais acessadas */}
            <WidgetCard title="Páginas mais acessadas · 30d" icon={Globe}>
              {topPages.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Sem dados ainda.</p>
              ) : (
                <ul className="space-y-1.5">
                  {topPages.map(([path, count]) => (
                    <li key={path}>
                      <button
                        onClick={() => setPagePathFilter(path)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition"
                      >
                        <FileText className="w-3 h-3 text-primary shrink-0" />
                        <span className="font-mono text-[11px] text-foreground/80 truncate flex-1 text-left">{path}</span>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">{count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>

            {/* Top usuários */}
            <WidgetCard title="Usuários mais ativos · 30d" icon={Users}>
              {topUsers.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Sem dados ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {topUsers.map(u => (
                    <li key={u.user_id}>
                      <button
                        onClick={() => { setUserFilter(u.user_id); setPage(0); }}
                        className="w-full flex items-center gap-2.5 px-1.5 py-1 rounded-lg hover:bg-muted/60 transition"
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold text-[10px] shrink-0",
                          userColor(u.user_id)
                        )}>
                          {initials(u.name)}
                        </div>
                        <span className="text-[12px] font-semibold text-foreground/90 truncate flex-1 text-left">{u.name}</span>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">{u.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>

            {/* Atividade por módulo */}
            <WidgetCard title="Atividade por módulo · 30d" icon={Layers}>
              {moduleStats.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Sem dados ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {moduleStats.map((m, i) => (
                    <li key={m.key}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-foreground/85">{m.label}</span>
                        <span className="font-mono text-muted-foreground">{m.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                          style={{ width: `${m.pct}%`, opacity: 0.7 + (0.05 * (moduleStats.length - i)) }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>

            {/* Heatmap */}
            <WidgetCard title="Heatmap · 4 semanas" icon={Sparkles}>
              <div className="flex gap-1">
                {heatmap.grid.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1 flex-1">
                    {week.map((v, di) => {
                      const intensity = v === 0 ? 0 : Math.min(4, Math.ceil((v / heatmap.max) * 4));
                      return (
                        <div
                          key={di}
                          title={`${v} evento${v !== 1 ? "s" : ""}`}
                          className={cn(
                            "h-3.5 rounded-sm",
                            intensity === 0 && "bg-muted",
                            intensity === 1 && "bg-primary/25",
                            intensity === 2 && "bg-primary/45",
                            intensity === 3 && "bg-primary/65",
                            intensity === 4 && "bg-primary",
                          )}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 text-[9.5px] text-muted-foreground">
                <span>Menos</span>
                <div className="flex gap-0.5">
                  <span className="w-2 h-2 rounded-sm bg-muted" />
                  <span className="w-2 h-2 rounded-sm bg-primary/25" />
                  <span className="w-2 h-2 rounded-sm bg-primary/45" />
                  <span className="w-2 h-2 rounded-sm bg-primary/65" />
                  <span className="w-2 h-2 rounded-sm bg-primary" />
                </div>
                <span>Mais</span>
              </div>
            </WidgetCard>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="tracking-tight">Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">Data/Hora</p>
                  <p className="font-mono text-xs mt-0.5">{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss")}</p>
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">Usuário</p>
                  <p className="font-medium text-[13px] mt-0.5">{selectedLog.user_name || "Sistema"}</p>
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">Ação</p>
                  <span className={cn("inline-block mt-0.5 text-[9px] font-extrabold uppercase tracking-[.1em] px-1.5 py-0.5 rounded", getActionStyle(selectedLog.action).cls)}>
                    {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">Módulo</p>
                  <p className="text-[12.5px] mt-0.5">{TARGET_LABELS[selectedLog.target_type] || selectedLog.target_type}</p>
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">Entidade</p>
                  <p className="font-mono text-[11px] mt-0.5">{selectedLog.target_id || "—"}</p>
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">IP</p>
                  <p className="font-mono text-[11px] mt-0.5">{maskIp(selectedLog.ip_address)}</p>
                </div>
                {selectedLog.details?.page_path && (
                  <div className="col-span-2">
                    <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">Página</p>
                    <button
                      onClick={() => { setPagePathFilter(selectedLog.details!.page_path); setSelectedLog(null); }}
                      className="font-mono text-[11px] text-primary hover:underline mt-0.5"
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
                  <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground mb-1">Payload</p>
                  <pre className="bg-muted/60 rounded-lg p-3 text-[10.5px] font-mono overflow-auto max-h-[200px] whitespace-pre-wrap leading-relaxed">
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

// ─── Sub-components ────────────────────────────────────────────────

function useMemoTopUsers(stats: AuditLog[]) {
  return useMemo(() => {
    const m: Record<string, { user_id: string; name: string }> = {};
    stats.forEach(l => {
      if (l.user_id && !m[l.user_id]) m[l.user_id] = { user_id: l.user_id, name: l.user_name || "Sistema" };
    });
    return Object.values(m).sort((a, b) => a.name.localeCompare(b.name));
  }, [stats]);
}

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  delta: number | null;
  sparkline: { area: string; line: string };
  keyId: number;
}
function KpiCard({ icon: Icon, label, value, delta, sparkline, keyId }: KpiCardProps) {
  const positive = delta != null && delta >= 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="absolute top-0 right-0 w-32 h-20 bg-primary/10 blur-2xl rounded-full" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md bg-primary/15 flex items-center justify-center">
            <Icon className="w-2.5 h-2.5 text-primary" />
          </div>
          <span className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground truncate">
            {label}
          </span>
        </div>
        <div className="text-3xl font-bold tracking-tight font-mono mb-2.5 leading-none">
          {value}
        </div>
        <div className="flex items-center justify-between">
          {delta != null ? (
            <span className={cn(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold",
              positive ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" : "bg-red-500/12 text-red-600 dark:text-red-400"
            )}>
              <ArrowUp className={cn("w-2.5 h-2.5", !positive && "rotate-180")} />
              {positive ? "+" : ""}{delta}%
            </span>
          ) : <span />}
          <span className="text-[10px] text-muted-foreground">vs período anterior</span>
        </div>
      </div>
      <svg className="absolute bottom-0 left-0 right-0 h-10 opacity-50 text-primary" viewBox="0 0 200 42" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`sg-${keyId}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity=".4" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {sparkline.area && <path d={sparkline.area} fill={`url(#sg-${keyId})`} />}
        {sparkline.line && <path d={sparkline.line} fill="none" stroke="currentColor" strokeWidth="1.5" />}
      </svg>
    </div>
  );
}

interface FilterListItemProps { children: React.ReactNode; active?: boolean; onClick?: () => void }
function FilterListItem({ children, active, onClick }: FilterListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] text-left transition",
        active ? "bg-primary/15 text-primary font-semibold" : "hover:bg-muted text-foreground/80"
      )}
    >
      {children}
    </button>
  );
}

interface LogRowProps {
  log: AuditLog;
  onClick: () => void;
  onFilterPage: (p: string) => void;
}
function LogRow({ log, onClick, onFilterPage }: LogRowProps) {
  const action = getActionStyle(log.action);
  const moduleLabel = TARGET_LABELS[log.target_type] || log.target_type;
  const path = log.details?.page_path;
  const ua = log.details?.user_agent;
  const sensitive = isSensitive(log.action);

  // Rich description
  const description = useMemo(() => {
    const d = log.details || {};
    if (log.action === "move_lead_stage" && d.from_stage && d.to_stage) {
      return (
        <>
          Moveu o lead <strong className="font-semibold text-foreground">{d.lead_name || log.target_id?.slice(0, 8)}</strong> da etapa{" "}
          <code className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-mono text-[11px]">{d.from_stage}</code>{" "}para{" "}
          <code className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-mono text-[11px]">{d.to_stage}</code>
        </>
      );
    }
    if (d.target_name) {
      return <>{(ACTION_LABELS[log.action] || log.action)} · <strong className="font-semibold text-foreground">{d.target_name}</strong></>;
    }
    return <>{ACTION_LABELS[log.action] || log.action.replace(/_/g, " ")} · <span className="font-mono text-[11px]">{log.target_id?.slice(0, 12) || "—"}</span></>;
  }, [log]);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 px-5 py-3.5 border-b border-border/60 cursor-pointer transition hover:bg-primary/[.04] group",
        sensitive && "bg-red-500/[.02]"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[13px] shrink-0 bg-gradient-to-br shadow-sm",
        userColor(log.user_id)
      )}>
        {initials(log.user_name)}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header line */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-bold tracking-tight text-foreground">
            {log.user_name || "Sistema"}
          </span>
          <span className={cn(
            "text-[9px] font-extrabold uppercase tracking-[.1em] px-1.5 py-0.5 rounded",
            action.cls
          )}>
            {action.label}
          </span>
          <span className="text-[9px] font-extrabold uppercase tracking-[.1em] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {moduleLabel}
          </span>
          {sensitive && (
            <span className="text-[9px] font-extrabold uppercase tracking-[.1em] px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 inline-flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> Sensível
            </span>
          )}
          <span className="ml-auto text-[10.5px] font-mono text-muted-foreground" title={format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}>
            {relativeTime(log.created_at)} · {format(new Date(log.created_at), "HH:mm:ss")}
          </span>
        </div>

        {/* Description */}
        <div className="text-[12.5px] text-foreground/80 leading-relaxed mt-1">
          {description}
        </div>

        {/* Export file card if any */}
        {log.details?.export_file && (
          <div onClick={(e) => e.stopPropagation()}>
            <AuditExportFileCard file={log.details.export_file} />
          </div>
        )}

        {/* Meta footer */}
        <div className="flex items-center gap-3 mt-1.5 text-[10.5px] text-muted-foreground flex-wrap">
          {path && (
            <button
              onClick={(e) => { e.stopPropagation(); onFilterPage(path); }}
              className="inline-flex items-center gap-1 text-primary font-mono hover:underline"
              title="Filtrar logs desta página"
            >
              <FileText className="w-2.5 h-2.5" />
              {path}
            </button>
          )}
          <span className="inline-flex items-center gap-1">
            <Monitor className="w-2.5 h-2.5" />
            {parseUserAgent(ua)}
          </span>
          <span className="inline-flex items-center gap-1 font-mono">
            <Shield className="w-2.5 h-2.5" />
            {maskIp(log.ip_address)}
          </span>
          <span className="opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-1 text-primary font-semibold ml-auto">
            <Eye className="w-2.5 h-2.5" /> Ver payload
          </span>
        </div>
      </div>
    </div>
  );
}
