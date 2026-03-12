import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Payment {
  id: string;
  kiwify_order_id: string;
  produto: string | null;
  customer_name: string | null;
  valor: number | null;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-status-paid text-status-paid-foreground" },
  approved: { label: "Pago", className: "bg-status-paid text-status-paid-foreground" },
  pending: { label: "Pendente", className: "bg-status-open text-status-open-foreground" },
  refused: { label: "Recusado", className: "bg-status-overdue text-status-overdue-foreground" },
  refunded: { label: "Reembolsado", className: "bg-status-cancelled text-status-cancelled-foreground" },
  chargedback: { label: "Chargeback", className: "bg-status-overdue text-status-overdue-foreground" },
};

export function RecentInvoices() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompanyId } = useAuth();

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      let query = supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (activeCompanyId) query = query.eq("company_id", activeCompanyId);

      const { data } = await query;
      setPayments((data as Payment[]) || []);
      setLoading(false);
    };
    fetchPayments();
  }, [activeCompanyId]);

  return (
    <div className="rounded-xl bg-card p-6 shadow-card animate-slide-up">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Pagamentos Recentes</h3>
        <a href="/boletos" className="text-sm font-medium text-primary hover:underline">Ver todos</a>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Receipt className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">Nenhum pagamento registrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const cfg = statusConfig[p.status] || { label: p.status, className: "bg-muted text-muted-foreground" };
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{p.customer_name || p.produto || "Pagamento"}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.kiwify_order_id.slice(0, 12)}... • {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-foreground">
                    {p.valor ? p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-"}
                  </p>
                  <Badge className={cn("font-medium", cfg.className)}>{cfg.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
