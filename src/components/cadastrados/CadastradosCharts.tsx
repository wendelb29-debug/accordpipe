import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const fmtCur = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 71%, 45%)",
  "hsl(0, 84%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(271, 81%, 56%)",
];

interface CadastradosChartsProps {
  registrations: any[];
}

export function CadastradosCharts({ registrations }: CadastradosChartsProps) {
  const mrrByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    registrations.forEach(r => {
      if ((r.client_status || "pendente") !== "cancelado" && r.data_adesao && r.valor_mensal) {
        const d = new Date(r.data_adesao);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months[key] = (months[key] || 0) + Number(r.valor_mensal);
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, value]) => ({
        month: month.split("-").reverse().join("/"),
        value,
      }));
  }, [registrations]);

  const growthByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    registrations.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = (months[key] || 0) + 1;
    });
    const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
    let cumulative = 0;
    return sorted.map(([month, count]) => {
      cumulative += count;
      return {
        month: month.split("-").reverse().join("/"),
        novos: count,
        acumulado: cumulative,
      };
    });
  }, [registrations]);

  const ltvDistribution = useMemo(() => {
    const buckets = [
      { label: "< R$100", min: 0, max: 100, count: 0 },
      { label: "R$100-300", min: 100, max: 300, count: 0 },
      { label: "R$300-500", min: 300, max: 500, count: 0 },
      { label: "R$500-1k", min: 500, max: 1000, count: 0 },
      { label: "> R$1k", min: 1000, max: Infinity, count: 0 },
    ];
    registrations.forEach(r => {
      if (r.valor_mensal && r.data_adesao) {
        const months = Math.max(1, Math.floor((Date.now() - new Date(r.data_adesao).getTime()) / (30 * 86400000)));
        const ltv = Number(r.valor_mensal) * months;
        const bucket = buckets.find(b => ltv >= b.min && ltv < b.max);
        if (bucket) bucket.count++;
      }
    });
    return buckets.filter(b => b.count > 0).map(b => ({ name: b.label, value: b.count }));
  }, [registrations]);

  if (registrations.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* MRR por mês */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Receita Mensal (MRR)</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mrrByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v >= 1000 ? (v/1000).toFixed(0) + "k" : v}`} />
                <Tooltip
                  formatter={(value: number) => [fmtCur(value), "MRR"]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 12 }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Crescimento de clientes */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Crescimento de Clientes</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 12 }}
                />
                <Line type="monotone" dataKey="acumulado" stroke="hsl(var(--primary))" strokeWidth={2} name="Acumulado" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="novos" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Novos" dot={{ r: 3 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* LTV Distribution */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição LTV</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ltvDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {ltvDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
