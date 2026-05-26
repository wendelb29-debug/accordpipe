import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  HeadphonesIcon,
  LineChart,
  Megaphone,
  ShieldCheck,
  Target,
  Users,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useOverdueCount } from "@/hooks/useOverdueCount";
import { Button } from "@/components/ui/button";

interface OperationsCommandCenterProps {
  isAdmin: boolean;
  onManageAnnouncements: () => void;
  onSupport: () => void;
}

export function OperationsCommandCenter({
  isAdmin,
  onManageAnnouncements,
  onSupport,
}: OperationsCommandCenterProps) {
  const { profile, isMaster, activeCompanyId, activeCompany } = useAuth();
  const overdueCount = useOverdueCount();
  const companyId = isMaster ? activeCompanyId : profile?.company_id;

  const [stats, setStats] = useState({
    leads: 0,
    contracts: 0,
    won: 0,
    clients: 0,
    activities: 0,
  });

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const [leads, contracts, won, clients, activities] = await Promise.all([
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("servidor_id", companyId),
        supabase.from("pdf_contracts").select("id", { count: "exact", head: true }).eq("servidor_id", companyId),
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("servidor_id", companyId).eq("stage", "won"),
        supabase.from("crm_client_registrations").select("id", { count: "exact", head: true }).eq("servidor_id", companyId),
        supabase.from("crm_lead_activities").select("id", { count: "exact", head: true }).eq("servidor_id", companyId),
      ]);
      setStats({
        leads: leads.count || 0,
        contracts: contracts.count || 0,
        won: won.count || 0,
        clients: clients.count || 0,
        activities: activities.count || 0,
      });
    })();
  }, [companyId]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.name?.split(" ")[0] || "Usuário";
  const companyName = activeCompany?.nome_fantasia || activeCompany?.razao_social || "Ambiente Accord";
  const dateStr = format(now, "EEEE, dd 'de' MMMM", { locale: ptBR });

  const conversion = stats.leads > 0 ? Math.round((stats.won / stats.leads) * 100) : 0;
  const openPipeline = Math.max(stats.leads - stats.won, 0);

  const kpis = [
    { label: "Leads ativos", value: stats.leads, icon: Users, tone: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Contratos", value: stats.contracts, icon: FileText, tone: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-100" },
    { label: "Ganhos", value: stats.won, icon: CheckCircle2, tone: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Clientes", value: stats.clients, icon: Target, tone: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100" },
  ];

  const priorities = useMemo(() => [
    {
      label: "Atividades vencidas",
      value: overdueCount,
      detail: overdueCount > 0 ? "Exige ação comercial" : "Fila controlada",
      icon: AlertCircle,
      tone: overdueCount > 0 ? "text-rose-700" : "text-emerald-700",
      bg: overdueCount > 0 ? "bg-rose-50" : "bg-emerald-50",
    },
    {
      label: "Pipeline aberto",
      value: openPipeline,
      detail: "Leads em andamento",
      icon: LineChart,
      tone: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Histórico operacional",
      value: stats.activities,
      detail: "Atividades registradas",
      icon: Activity,
      tone: "text-slate-700",
      bg: "bg-slate-100",
    },
  ], [openPipeline, overdueCount, stats.activities]);

  return (
    <div className="rounded-[10px] border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Top navy bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
            Centro de comando
          </span>
          <span className="text-lg font-semibold text-white mt-0.5">
            {greeting}, {firstName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={onManageAnnouncements}
              className="h-8 gap-1.5 bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <Megaphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Comunicados</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={onSupport}
            className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-500"
          >
            <HeadphonesIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Suporte</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-200">
          {/* Meta row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-200 rounded-[8px] overflow-hidden border border-slate-200 mb-5">
            <div className="bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Empresa</p>
              <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{companyName}</p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Data</p>
              <p className="text-sm font-semibold text-slate-900 mt-1 capitalize">{dateStr}</p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Conversão</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {conversion}% <span className="text-xs font-normal text-slate-500">de leads ganhos</span>
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="rounded-[8px] border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
                >
                  <div className={`h-8 w-8 rounded-md ${kpi.bg} ${kpi.tone} flex items-center justify-center mb-3`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums leading-none">
                    {kpi.value}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-500">Tempo real</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="p-5 bg-slate-50/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
                Prioridades
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">Fila executiva</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>

          <div className="space-y-2">
            {priorities.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-[8px] border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors"
                >
                  <div className={`h-8 w-8 shrink-0 rounded-md ${item.bg} ${item.tone} flex items-center justify-center`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-700 truncate">{item.label}</p>
                      <span className="text-sm font-bold text-slate-900 tabular-nums">{item.value}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">
              Saúde do sistema
            </p>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-slate-900">Operação estável</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Dados consolidados de CRM, contratos, clientes e atividades.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
