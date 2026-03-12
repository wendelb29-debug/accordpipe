import { useEffect, useState } from "react";
import { Building2, Receipt, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { InvoiceStatusChart } from "@/components/dashboard/InvoiceStatusChart";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { supabase } from "@/integrations/supabase/client";


export default function Dashboard() {
  const [stats, setStats] = useState({ active: 0, overdue: 0, cancelled: 0, openAmount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const [companiesRes, paymentsRes] = await Promise.all([
        supabase.from("companies").select("status"),
        supabase.from("payments").select("status, valor"),
      ]);

      const companies = (companiesRes.data as any[]) || [];
      const payments = (paymentsRes.data as any[]) || [];

      const active = companies.filter((c) => c.status === "active").length;
      const cancelled = companies.filter((c) => c.status === "cancelled").length;
      const overdue = payments.filter((p) => p.status === "pending" || p.status === "refused").length;
      const openAmount = payments
        .filter((p) => p.status === "pending")
        .reduce((sum: number, p: any) => sum + (p.valor || 0), 0);

      setStats({ active, overdue, cancelled, openAmount });
      setLoading(false);
    };
    fetchStats();
  }, []);

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
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema de gestão</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Clientes Ativos" value={stats.active} description="Total de empresas ativas" icon={Building2} variant="success" />
        <StatCard title="Inadimplentes" value={stats.overdue} description="Pagamentos pendentes/recusados" icon={AlertTriangle} variant="warning" />
        <StatCard title="Cancelados" value={stats.cancelled} description="Contratos encerrados" icon={XCircle} variant="danger" />
        <StatCard
          title="Pagamentos Pendentes"
          value={stats.openAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          description="Valor total pendente"
          icon={Receipt}
          variant="info"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <InvoiceStatusChart />
        </div>
        <div className="lg:col-span-3">
          <RecentInvoices />
        </div>
      </div>
    </div>
  );
}
