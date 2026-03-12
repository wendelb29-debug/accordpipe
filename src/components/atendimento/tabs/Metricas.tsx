import { MessageSquare, Users, Clock, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Mensagens Hoje", value: "347", change: "+12%", up: true, icon: MessageSquare },
  { label: "Contatos Ativos", value: "62", change: "+5%", up: true, icon: Users },
  { label: "Tempo Médio Resposta", value: "3m 24s", change: "-18%", up: true, icon: Clock },
  { label: "Taxa de Conversão", value: "23%", change: "-2%", up: false, icon: TrendingUp },
];

const agentStats = [
  { name: "Carlos", messages: 128, avgResponse: "2m 15s", conversations: 18 },
  { name: "Ana", messages: 95, avgResponse: "4m 30s", conversations: 14 },
  { name: "Pedro", messages: 76, avgResponse: "3m 45s", conversations: 11 },
];

export function Metricas() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Métricas</h2>
        <p className="text-sm text-muted-foreground">Acompanhe o desempenho do atendimento</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-5 w-5 text-muted-foreground" />
                <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.up ? "text-emerald-600" : "text-destructive"}`}>
                  {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Desempenho por Atendente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agentStats.map((agent) => (
              <div key={agent.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {agent.name[0]}
                  </div>
                  <span className="text-sm font-medium text-foreground">{agent.name}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{agent.messages}</p>
                    <p className="text-[10px] text-muted-foreground">Mensagens</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{agent.avgResponse}</p>
                    <p className="text-[10px] text-muted-foreground">Tempo Resp.</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{agent.conversations}</p>
                    <p className="text-[10px] text-muted-foreground">Conversas</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
