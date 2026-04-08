import { useEffect, useState, useMemo } from "react";
import {
  Building2, Receipt, AlertTriangle, XCircle, Loader2, TrendingUp, Users,
  DollarSign, Target, ClipboardCheck, Clock, CheckCircle, Trophy, BarChart3,
  ArrowRight, Filter, CalendarDays
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from "recharts";

type PeriodFilter = "today" | "7d" | "30d" | "month" | "year" | "custom";

function getDateRange(period: PeriodFilter, customStart?: string, customEnd?: string) {
  const now = new Date();
  let start: Date;
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "7d":
      start = new Date(now); start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start = new Date(now); start.setDate(start.getDate() - 30);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom":
      start = customStart ? new Date(customStart) : new Date(now.getFullYear(), 0, 1);
      end = customEnd ? new Date(customEnd + "T23:59:59") : end;
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function Dashboard() {
  const { role, profile } = useAuth();
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [loading, setLoading] = useState(true);

  // Data
  const [companies, setCompanies] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const dateRange = useMemo(() => getDateRange(period, customStart, customEnd), [period, customStart, customEnd]);

  const isAdminLevel = role === "admin" || role === "ceo" || profile?.is_master;
  const isOperador = role === "operador" || role === "comercial";
  const isAdministrativo = role === "administrativo";

  const fetchData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);

    const servId = profile.company_id;
    const { start, end } = dateRange;

    const [compRes, payRes, leadRes, regRes] = await Promise.all([
      supabase.from("companies").select("status, created_at"),
      supabase.from("payments").select("status, valor, created_at, customer_name"),
      supabase.from("crm_leads").select("id, lead_status, stage, created_at, value_mrr, value_ps, created_by_user_id, created_by_name, company_name, servidor_id")
        .eq("servidor_id", servId).gte("created_at", start).lte("created_at", end),
      supabase.from("crm_client_registrations").select("id, status, created_at, created_by_user_id, created_by_name, servidor_id")
        .eq("servidor_id", servId).gte("created_at", start).lte("created_at", end),
    ]);

    setCompanies(compRes.data || []);
    setPayments(payRes.data || []);
    setLeads(leadRes.data || []);
    setRegistrations(regRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile, dateRange]);

  // Filtered data for operador
  const myLeads = isOperador ? leads.filter(l => l.created_by_user_id === profile?.user_id) : leads;
  const myRegs = isAdministrativo ? registrations.filter(r => r.created_by_user_id === profile?.user_id) : registrations;

  // Stats
  const totalLeads = myLeads.length;
  const wonLeads = myLeads.filter(l => l.lead_status === "won").length;
  const totalSalesValue = myLeads.filter(l => l.lead_status === "won").reduce((s, l) => s + (l.value_ps || 0) + (l.value_mrr || 0), 0);
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const totalRegs = myRegs.length;
  const pendingRegs = myRegs.filter(r => r.status === "pendente").length;
  const completedRegs = myRegs.filter(r => r.status === "concluido").length;

  const activeCompanies = companies.filter(c => c.status === "active").length;
  const cancelledCompanies = companies.filter(c => c.status === "cancelled").length;
  const pendingPayments = payments.filter(p => p.status === "pending").reduce((s, p) => s + (p.valor || 0), 0);

  // Chart data - group by day
  const salesChartData = useMemo(() => {
    const map: Record<string, { date: string; vendas: number; valor: number }> = {};
    myLeads.filter(l => l.lead_status === "won").forEach(l => {
      const d = new Date(l.created_at).toLocaleDateString("pt-BR");
      if (!map[d]) map[d] = { date: d, vendas: 0, valor: 0 };
      map[d].vendas++;
      map[d].valor += (l.value_ps || 0) + (l.value_mrr || 0);
    });
    return Object.values(map).slice(-15);
  }, [myLeads]);

  const regsChartData = useMemo(() => {
    const map: Record<string, { date: string; cadastros: number }> = {};
    myRegs.forEach(r => {
      const d = new Date(r.created_at).toLocaleDateString("pt-BR");
      if (!map[d]) map[d] = { date: d, cadastros: 0 };
      map[d].cadastros++;
    });
    return Object.values(map).slice(-15);
  }, [myRegs]);

  // Rankings
  const vendedorRanking = useMemo(() => {
    const map: Record<string, { name: string; count: number; value: number }> = {};
    leads.filter(l => l.lead_status === "won").forEach(l => {
      const key = l.created_by_user_id || "unknown";
      if (!map[key]) map[key] = { name: l.created_by_name || "Desconhecido", count: 0, value: 0 };
      map[key].count++;
      map[key].value += (l.value_ps || 0) + (l.value_mrr || 0);
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [leads]);

  const cadastroRanking = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    registrations.filter(r => r.status === "concluido").forEach(r => {
      const key = r.created_by_user_id || "unknown";
      if (!map[key]) map[key] = { name: r.created_by_name || "Desconhecido", count: 0 };
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [registrations]);

  // Funnel
  const funnelData = useMemo(() => {
    const total = leads.length;
    const proposals = leads.filter(l => ["proposta", "negociacao", "contrato-fechado"].includes(l.stage) || l.lead_status === "won").length;
    const won = leads.filter(l => l.lead_status === "won").length;
    const registered = registrations.filter(r => r.status === "concluido").length;
    return [
      { stage: "Leads", count: total, pct: 100 },
      { stage: "Propostas", count: proposals, pct: total > 0 ? Math.round((proposals / total) * 100) : 0 },
      { stage: "Ganhos", count: won, pct: total > 0 ? Math.round((won / total) * 100) : 0 },
      { stage: "Cadastros", count: registered, pct: total > 0 ? Math.round((registered / total) * 100) : 0 },
    ];
  }, [leads, registrations]);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral da sua operação</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Período:</span>
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {period === "custom" && (
              <>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-40 h-9" />
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-40 h-9" />
              </>
            )}
            <Button size="sm" onClick={fetchData} className="gap-1.5 h-9">
              <CalendarDays className="h-4 w-4" /> Aplicar filtro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards based on role */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {isOperador && (
          <>
            <StatCard title="Minhas Vendas" value={wonLeads} description="Leads ganhos no período" icon={TrendingUp} variant="success" />
            <StatCard title="Valor Vendido" value={formatCurrency(totalSalesValue)} description="Total em vendas" icon={DollarSign} variant="info" />
            <StatCard title="Leads Criados" value={totalLeads} description="Total de leads" icon={Target} variant="default" />
            <StatCard title="Conversão" value={`${conversionRate}%`} description="Taxa de conversão" icon={BarChart3} variant="warning" />
          </>
        )}
        {isAdministrativo && (
          <>
            <StatCard title="Cadastros Realizados" value={totalRegs} description="Total no período" icon={ClipboardCheck} variant="success" />
            <StatCard title="Cadastros Pendentes" value={pendingRegs} description="Aguardando preenchimento" icon={Clock} variant="warning" />
            <StatCard title="Cadastros Concluídos" value={completedRegs} description="Finalizados" icon={CheckCircle} variant="info" />
            <StatCard title="Clientes Ativos" value={activeCompanies} description="Total de empresas" icon={Building2} variant="default" />
          </>
        )}
        {isAdminLevel && (
          <>
            <StatCard title="Total de Vendas" value={wonLeads} description="Leads ganhos no período" icon={TrendingUp} variant="success" />
            <StatCard title="Cadastros" value={totalRegs} description="Cadastros no período" icon={ClipboardCheck} variant="info" />
            <StatCard title="Clientes Ativos" value={activeCompanies} description="Empresas ativas" icon={Building2} variant="default" />
            <StatCard title="Pagamentos Pendentes" value={formatCurrency(pendingPayments)} description="Valor total pendente" icon={Receipt} variant="warning" />
          </>
        )}
        {!isOperador && !isAdministrativo && !isAdminLevel && (
          <>
            <StatCard title="Clientes Ativos" value={activeCompanies} description="Total de empresas" icon={Building2} variant="success" />
            <StatCard title="Cancelados" value={cancelledCompanies} description="Contratos encerrados" icon={XCircle} variant="danger" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vendas Chart */}
        {(isOperador || isAdminLevel) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Vendas por Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesChartData.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">Sem vendas no período</p>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 12 }} />
                      <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cadastros Chart */}
        {(isAdministrativo || isAdminLevel) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" /> Cadastros por Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              {regsChartData.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">Sem cadastros no período</p>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={regsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 12 }} />
                      <Line type="monotone" dataKey="cadastros" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Funnel + Rankings - only for admin level */}
      {isAdminLevel && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Funnel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Funil de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {funnelData.map((f, i) => (
                <div key={f.stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{f.stage}</span>
                    <span className="text-sm text-muted-foreground">{f.count} ({f.pct}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(f.pct, 2)}%` }}
                    />
                  </div>
                  {i < funnelData.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowRight className="h-3 w-3 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Ranking vendedores */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> Top Vendedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendedorRanking.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Sem dados no período</p>
              ) : (
                <div className="space-y-3">
                  {vendedorRanking.map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary w-6">{i + 1}º</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.count} vendas</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{formatCurrency(v.value)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ranking cadastros */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Top Cadastros
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cadastroRanking.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Sem dados no período</p>
              ) : (
                <div className="space-y-3">
                  {cadastroRanking.map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary w-6">{i + 1}º</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.count} cadastros</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
