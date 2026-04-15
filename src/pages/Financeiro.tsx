import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { toast } from "sonner";
import { GerarPixModal, LinkPagamentoModal, RecorrenciaModal, NovaCobrancaModal } from "@/components/fintech/AsaasModals";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  DollarSign, Plus, Loader2, Search, AlertTriangle, CheckCircle2,
  XCircle, Clock, CreditCard, History, TrendingUp, TrendingDown,
  Wallet, ArrowUpRight, ArrowDownRight, QrCode, Link2, RefreshCw,
  Zap, BarChart3, Users, Percent, Shield,
} from "lucide-react";

const fmtCur = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
const fmtCompact = (v: number) => {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return fmtCur(v);
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; dotColor: string }> = {
  pendente: { label: "Pendente", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock, dotColor: "bg-amber-500" },
  pago: { label: "Pago", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2, dotColor: "bg-emerald-500" },
  vencido: { label: "Vencido", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertTriangle, dotColor: "bg-red-500" },
  cancelado: { label: "Cancelado", color: "bg-muted text-muted-foreground border-border", icon: XCircle, dotColor: "bg-muted-foreground" },
};

export default function Financeiro() {
  const { profile } = useAuth();
  const activeCompanyId = useActiveCompanyId();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [webhookConfigured, setWebhookConfigured] = useState(false);

  // Modal states
  const [pixOpen, setPixOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [recorrenciaOpen, setRecorrenciaOpen] = useState(false);
  const [cobrancaOpen, setCobrancaOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: txData }, { data: regData }, { data: intData }, { data: companyData }] = await Promise.all([
      supabase.from("financial_transactions" as any).select("*, crm_client_registrations(nome_completo, lead_id)").order("created_at", { ascending: false }),
      supabase.from("crm_client_registrations").select("id, nome_completo, lead_id, servidor_id, cpf, email"),
      activeCompanyId
        ? supabase.from("fintech_integrations").select("id, provider, display_name, is_active, environment").eq("servidor_id", activeCompanyId).eq("is_active", true)
        : Promise.resolve({ data: [] }),
      activeCompanyId
        ? supabase.from("companies").select("webhook_token").eq("id", activeCompanyId).single()
        : Promise.resolve({ data: null }),
    ]);
    setTransactions(txData || []);
    setRegistrations(regData || []);
    setIntegrations(intData || []);
    setWebhookConfigured(!!companyData?.webhook_token);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const updateStatus = async (id: string, status: string, regId?: string) => {
    await supabase.from("financial_transactions" as any).update({
      status,
      ...(status === "pago" ? { paid_at: new Date().toISOString() } : {}),
    }).eq("id", id);

    if (regId) {
      if (status === "pago") {
        await supabase.from("crm_client_registrations").update({ client_status: "ativo" } as any).eq("id", regId);
      } else if (status === "vencido") {
        await supabase.from("crm_client_registrations").update({ client_status: "inadimplente" } as any).eq("id", regId);
      } else if (status === "cancelado") {
        await supabase.from("crm_client_registrations").update({ client_status: "cancelado" } as any).eq("id", regId);
      }
    }

    toast.success(`Status atualizado para ${statusConfig[status]?.label || status}`);
    await fetchData();
  };

  const filtered = useMemo(() => {
    if (!search) return transactions;
    const s = search.toLowerCase();
    return transactions.filter((t: any) =>
      t.description?.toLowerCase().includes(s) ||
      t.reference?.toLowerCase().includes(s) ||
      (t.crm_client_registrations as any)?.nome_completo?.toLowerCase().includes(s)
    );
  }, [transactions, search]);

  const byStatus = (s: string) => filtered.filter((t: any) => t.status === s);

  const totals = useMemo(() => ({
    pendente: byStatus("pendente").reduce((a: number, t: any) => a + Number(t.amount), 0),
    pago: byStatus("pago").reduce((a: number, t: any) => a + Number(t.amount), 0),
    vencido: byStatus("vencido").reduce((a: number, t: any) => a + Number(t.amount), 0),
    cancelado: byStatus("cancelado").reduce((a: number, t: any) => a + Number(t.amount), 0),
  }), [filtered]);

  // Chart data - monthly aggregation
  const chartData = useMemo(() => {
    const months: Record<string, { month: string; receita: number; pendente: number; vencido: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      months[key] = { month: label.charAt(0).toUpperCase() + label.slice(1), receita: 0, pendente: 0, vencido: 0 };
    }
    transactions.forEach((t: any) => {
      const d = t.due_date || t.created_at;
      if (!d) return;
      const key = d.substring(0, 7);
      if (months[key]) {
        if (t.status === "pago") months[key].receita += Number(t.amount);
        else if (t.status === "pendente") months[key].pendente += Number(t.amount);
        else if (t.status === "vencido") months[key].vencido += Number(t.amount);
      }
    });
    return Object.values(months);
  }, [transactions]);

  // KPIs
  const totalReceita = totals.pago;
  const totalMRR = useMemo(() => {
    return transactions
      .filter((t: any) => t.type === "mensalidade" && t.status === "pago")
      .reduce((a: number, t: any) => a + Number(t.amount), 0);
  }, [transactions]);

  const inadimplenciaRate = useMemo(() => {
    const total = transactions.length;
    if (!total) return 0;
    return Math.round((byStatus("vencido").length / total) * 100);
  }, [transactions]);

  const previsaoEntrada = totals.pendente;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando financeiro...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Fintech</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestão financeira completa do seu negócio</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setPixOpen(true)}>
            <QrCode className="h-3.5 w-3.5" /> Gerar PIX
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setLinkOpen(true)}>
            <Link2 className="h-3.5 w-3.5" /> Link de Pagamento
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setRecorrenciaOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5" /> Recorrência
          </Button>
          <Button size="sm" onClick={() => setCobrancaOpen(true)} className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" /> Nova Cobrança
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Receita Total"
          value={fmtCur(totalReceita)}
          subtitle="Pagamentos confirmados"
          icon={DollarSign}
          trend={totalReceita > 0 ? "up" : "neutral"}
          accentClass="text-emerald-500"
          bgClass="bg-emerald-500/10"
        />
        <KPICard
          title="MRR"
          value={fmtCur(totalMRR)}
          subtitle="Receita recorrente mensal"
          icon={TrendingUp}
          trend="up"
          accentClass="text-primary"
          bgClass="bg-primary/10"
        />
        <KPICard
          title="Previsão de Entrada"
          value={fmtCur(previsaoEntrada)}
          subtitle={`${byStatus("pendente").length} cobranças pendentes`}
          icon={Wallet}
          trend="neutral"
          accentClass="text-amber-500"
          bgClass="bg-amber-500/10"
        />
        <KPICard
          title="Inadimplência"
          value={`${inadimplenciaRate}%`}
          subtitle={`${byStatus("vencido").length} cobranças vencidas`}
          icon={AlertTriangle}
          trend={inadimplenciaRate > 10 ? "down" : "up"}
          accentClass="text-red-500"
          bgClass="bg-red-500/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Evolução de Receita</h3>
                <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCompact(v)} width={60} />
                <RechartsTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number) => [fmtCur(value), "Receita"]}
                />
                <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#receitaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Receita vs Inadimplência</h3>
                <p className="text-xs text-muted-foreground">Comparativo mensal</p>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <TrendingDown className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtCompact(v)} width={60} />
                <RechartsTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [fmtCur(value), name === "receita" ? "Receita" : name === "pendente" ? "Pendente" : "Vencido"]}
                />
                <Bar dataKey="receita" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="pendente" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="vencido" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary mini cards row */}
      <div className="grid grid-cols-4 gap-3">
        {(["pendente", "pago", "vencido", "cancelado"] as const).map((st) => {
          const cfg = statusConfig[st];
          const Icon = cfg.icon;
          const count = byStatus(st).length;
          const total = totals[st];
          return (
            <Card key={st} className="border-border/50 hover:border-border transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${cfg.color.split(" ")[0]}`}>
                  <Icon className={`h-4 w-4 ${cfg.color.split(" ")[1]}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{cfg.label}</p>
                  <p className="text-base font-bold text-foreground truncate">{fmtCur(total)}</p>
                  <p className="text-[10px] text-muted-foreground">{count} registro{count !== 1 ? "s" : ""}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente, descrição ou referência..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs gap-1.5 h-7"><BarChart3 className="h-3 w-3" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="cobrancas" className="text-xs gap-1.5 h-7"><CreditCard className="h-3 w-3" /> Cobranças</TabsTrigger>
          <TabsTrigger value="pagamentos" className="text-xs gap-1.5 h-7"><CheckCircle2 className="h-3 w-3" /> Pagos</TabsTrigger>
          <TabsTrigger value="inadimplencia" className="text-xs gap-1.5 h-7"><AlertTriangle className="h-3 w-3" /> Inadimplência</TabsTrigger>
          <TabsTrigger value="historico" className="text-xs gap-1.5 h-7"><History className="h-3 w-3" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Insights Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InsightCard
              icon={Users}
              title="Assinaturas Ativas"
              value={String(registrations.length)}
              description="Clientes na base"
              accentClass="text-primary"
            />
            <InsightCard
              icon={Percent}
              title="Taxa de Inadimplência"
              value={`${inadimplenciaRate}%`}
              description={inadimplenciaRate <= 5 ? "Excelente" : inadimplenciaRate <= 15 ? "Atenção" : "Crítico"}
              accentClass={inadimplenciaRate <= 5 ? "text-emerald-500" : inadimplenciaRate <= 15 ? "text-amber-500" : "text-red-500"}
            />
            <InsightCard
              icon={Shield}
              title="Saúde Financeira"
              value={totals.pago > totals.vencido ? "Boa" : "Atenção"}
              description={`Receita: ${fmtCur(totals.pago)} | Vencido: ${fmtCur(totals.vencido)}`}
              accentClass={totals.pago > totals.vencido ? "text-emerald-500" : "text-amber-500"}
            />
          </div>

          {/* Recent transactions */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Últimas Transações</h3>
              <TransactionTable items={filtered.slice(0, 10)} onUpdateStatus={updateStatus} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cobrancas" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <TransactionTable items={byStatus("pendente")} onUpdateStatus={updateStatus} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <TransactionTable items={byStatus("pago")} onUpdateStatus={updateStatus} showActions={false} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inadimplencia" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <TransactionTable items={byStatus("vencido")} onUpdateStatus={updateStatus} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <TransactionTable items={filtered} onUpdateStatus={updateStatus} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Integrations Section */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Integrações de Pagamento</h3>
              <p className="text-xs text-muted-foreground">Gateways e automações conectadas</p>
            </div>
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {integrations.map((int) => {
              const statusLabel = int.environment === "production" ? "Produção" : "Sandbox";
              return (
                <div key={int.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{int.display_name || int.provider}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-emerald-500 capitalize">{statusLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {webhookConfigured && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Link2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Webhook</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-emerald-500">Configurado</span>
                  </div>
                </div>
              </div>
            )}
            {integrations.length === 0 && !webhookConfigured && (
              <div className="col-span-full text-center py-4">
                <p className="text-xs text-muted-foreground">Nenhuma integração configurada. Configure em Webhooks Fintech no tenant.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Asaas Modals */}
      <GerarPixModal
        open={pixOpen}
        onOpenChange={setPixOpen}
        tenantId={activeCompanyId}
        registrations={registrations}
        onSuccess={fetchData}
      />
      <LinkPagamentoModal
        open={linkOpen}
        onOpenChange={setLinkOpen}
        tenantId={activeCompanyId}
        registrations={registrations}
        onSuccess={fetchData}
      />
      <RecorrenciaModal
        open={recorrenciaOpen}
        onOpenChange={setRecorrenciaOpen}
        tenantId={activeCompanyId}
        registrations={registrations}
        onSuccess={fetchData}
      />
      <NovaCobrancaModal
        open={cobrancaOpen}
        onOpenChange={setCobrancaOpen}
        tenantId={activeCompanyId}
        registrations={registrations}
        onSuccess={fetchData}
      />
    </div>
  );
}

/* ── Sub-components ── */

function KPICard({ title, value, subtitle, icon: Icon, trend, accentClass, bgClass }: {
  title: string; value: string; subtitle: string; icon: React.ElementType;
  trend: "up" | "down" | "neutral"; accentClass: string; bgClass: string;
}) {
  return (
    <Card className="border-border/50 hover:border-border transition-colors overflow-hidden relative group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{title}</p>
            <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{value}</p>
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${bgClass}`}>
            <Icon className={`h-5 w-5 ${accentClass}`} />
          </div>
        </div>
        {trend !== "neutral" && (
          <div className={`flex items-center gap-1 mt-2 text-[10px] font-medium ${trend === "up" ? "text-emerald-500" : "text-red-500"}`}>
            {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{trend === "up" ? "Positivo" : "Atenção"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightCard({ icon: Icon, title, value, description, accentClass }: {
  icon: React.ElementType; title: string; value: string; description: string; accentClass: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2.5 rounded-xl bg-card border border-border/50`}>
          <Icon className={`h-5 w-5 ${accentClass}`} />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={`text-lg font-bold ${accentClass}`}>{value}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionTable({ items, onUpdateStatus, showActions = true }: {
  items: any[]; onUpdateStatus: (id: string, status: string, regId?: string) => void; showActions?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/50">
          <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Cliente</TableHead>
          <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Descrição</TableHead>
          <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Valor</TableHead>
          <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Vencimento</TableHead>
          <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Status</TableHead>
          {showActions && <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-12">
              <div className="flex flex-col items-center gap-2">
                <DollarSign className="h-8 w-8 text-muted-foreground/30" />
                <span>Nenhuma transação encontrada</span>
              </div>
            </TableCell>
          </TableRow>
        )}
        {items.map((t: any) => {
          const cfg = statusConfig[t.status] || statusConfig.pendente;
          return (
            <TableRow key={t.id} className="border-border/30 hover:bg-accent/30 transition-colors">
              <TableCell className="text-xs font-medium">{(t.crm_client_registrations as any)?.nome_completo || "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{t.description || t.type}</TableCell>
              <TableCell className="text-sm font-semibold text-foreground">{fmtCur(Number(t.amount))}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{t.due_date ? fmtDate(t.due_date) : "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] font-medium gap-1 ${cfg.color}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
                  {cfg.label}
                </Badge>
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex gap-1">
                    {t.status === "pendente" && (
                      <>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" onClick={() => onUpdateStatus(t.id, "pago", t.registration_id)}>
                          <CheckCircle2 className="h-3 w-3" /> Pago
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => onUpdateStatus(t.id, "vencido", t.registration_id)}>
                          <AlertTriangle className="h-3 w-3" /> Vencido
                        </Button>
                      </>
                    )}
                    {t.status === "vencido" && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" onClick={() => onUpdateStatus(t.id, "pago", t.registration_id)}>
                        <CheckCircle2 className="h-3 w-3" /> Pago
                      </Button>
                    )}
                    {t.status !== "cancelado" && (
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={() => onUpdateStatus(t.id, "cancelado", t.registration_id)}>
                        <XCircle className="h-3 w-3" /> Cancelar
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
