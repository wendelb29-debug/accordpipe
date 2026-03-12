import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function InvoiceStatusChart() {
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompanyId } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let query = supabase.from("payments").select("status");
      if (activeCompanyId) query = query.eq("company_id", activeCompanyId);

      const { data: payments } = await query;
      const list = (payments as any[]) || [];
      const paid = list.filter((p) => p.status === "paid" || p.status === "approved").length;
      const pending = list.filter((p) => p.status === "pending").length;
      const refused = list.filter((p) => p.status === "refused" || p.status === "chargedback").length;
      const refunded = list.filter((p) => p.status === "refunded").length;

      setData([
        { name: "Pagos", value: paid, color: "hsl(142, 71%, 45%)" },
        { name: "Pendentes", value: pending, color: "hsl(217, 91%, 60%)" },
        { name: "Recusados", value: refused, color: "hsl(0, 84%, 60%)" },
        { name: "Reembolsados", value: refunded, color: "hsl(271, 81%, 56%)" },
      ].filter((d) => d.value > 0));
      setLoading(false);
    };
    fetchData();
  }, [activeCompanyId]);

  return (
    <div className="rounded-xl bg-card p-6 shadow-card animate-slide-up">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Status dos Pagamentos</h3>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Sem dados de pagamento</div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} />
              <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
