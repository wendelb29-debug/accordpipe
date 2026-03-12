import { Bot, Plus, Zap, Clock, MessageSquare, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const mockAutomations = [
  { id: "1", name: "Boas-vindas automática", trigger: "Novo contato", action: "Enviar mensagem de boas-vindas", active: true },
  { id: "2", name: "Resposta fora do horário", trigger: "Mensagem recebida fora do expediente", action: "Enviar mensagem informando horário", active: true },
  { id: "3", name: "Follow-up 24h", trigger: "Sem resposta após 24h", action: "Enviar lembrete", active: false },
  { id: "4", name: "Distribuição de leads", trigger: "Novo lead sem atribuição", action: "Atribuir ao vendedor disponível", active: false },
];

export function Automacoes() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Automações</h2>
          <p className="text-sm text-muted-foreground">Configure respostas e ações automáticas</p>
        </div>
        <Button className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> Nova Automação
        </Button>
      </div>

      <div className="space-y-3">
        {mockAutomations.map((auto) => (
          <Card key={auto.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{auto.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {auto.trigger}
                      </span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {auto.action}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={auto.active ? "default" : "secondary"} className="text-[10px]">
                    {auto.active ? "Ativa" : "Inativa"}
                  </Badge>
                  <Switch checked={auto.active} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
