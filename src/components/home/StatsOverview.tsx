import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Users, FileText, TrendingUp, CheckCircle } from "lucide-react";

export function StatsOverview() {
  const { profile, isMaster, activeCompanyId } = useAuth();
  const companyId = isMaster ? activeCompanyId : profile?.company_id;
  const [stats, setStats] = useState({ leads: 0, contracts: 0, won: 0, clients: 0 });

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const [leads, contracts, won, clients] = await Promise.all([
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("servidor_id", companyId),
        supabase.from("pdf_contracts").select("id", { count: "exact", head: true }).eq("servidor_id", companyId),
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("servidor_id", companyId).eq("stage", "won"),
        supabase.from("crm_client_registrations").select("id", { count: "exact", head: true }).eq("servidor_id", companyId),
      ]);
      setStats({
        leads: leads.count || 0,
        contracts: contracts.count || 0,
        won: won.count || 0,
        clients: clients.count || 0,
      });
    })();
  }, [companyId]);

  const cards = [
    { label: "Leads", value: stats.leads, icon: Users, color: "hsl(var(--primary))" },
    { label: "Contratos", value: stats.contracts, icon: FileText, color: "hsl(263, 87%, 60%)" },
    { label: "Ganhos", value: stats.won, icon: TrendingUp, color: "hsl(152, 55%, 40%)" },
    { label: "Clientes", value: stats.clients, icon: CheckCircle, color: "hsl(32, 95%, 50%)" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-4 flex items-center gap-3 border-border/60">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${c.color}12`, color: c.color }}>
            <c.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
