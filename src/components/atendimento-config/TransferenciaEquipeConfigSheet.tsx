import { useEffect, useState } from "react";
import type { AgentTeam, AgentTeamConfig, Team } from "@/hooks/useAgentTeams";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function TransferenciaEquipeConfigSheet({
  open, row, team, teams, onClose, onSave,
}: {
  open: boolean;
  row: AgentTeam | null;
  team: Team | null;
  teams: Team[];
  onClose: () => void;
  onSave: (config: AgentTeamConfig) => void | Promise<void>;
}) {
  const [cfg, setCfg] = useState<AgentTeamConfig>({});

  useEffect(() => { setCfg(row?.config ?? {}); }, [row?.id]);

  if (!row || !team) return null;

  const patch = (p: Partial<AgentTeamConfig>) => setCfg((c) => ({ ...c, ...p }));

  const handleSave = async () => {
    await onSave(cfg);
    toast.success("Configuração salva");
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {team.name}
            <Badge variant="outline" className="text-[10px]">
              {team.status === "active" ? "Ativa" : team.status}
            </Badge>
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Configuração completa (mensagens, canais, fallback avançado) chegará na Onda 2. Já é possível salvar o essencial abaixo.
          </p>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm">Quando utilizar esta equipe (orientação para a IA)</Label>
            <Textarea
              rows={4}
              value={cfg.ai_guidance ?? ""}
              onChange={(e) => patch({ ai_guidance: e.target.value })}
              placeholder="Ex.: Transferir para esta equipe quando o cliente solicitar orçamento, condições comerciais ou demonstração."
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Prioridade</Label>
              <Select value={cfg.priority ?? "medium"} onValueChange={(v: any) => patch({ priority: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Modo de transferência</Label>
              <Select value={cfg.transfer_mode ?? "auto"} onValueChange={(v: any) => patch({ transfer_mode: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automática</SelectItem>
                  <SelectItem value="confirm">Pedir confirmação</SelectItem>
                  <SelectItem value="suggest">Apenas sugerir</SelectItem>
                  <SelectItem value="request">Criar solicitação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm">Mensagem antes da transferência</Label>
            <Textarea
              rows={2}
              value={cfg.message_before ?? ""}
              onChange={(e) => patch({ message_before: e.target.value })}
              placeholder="Certo, vou encaminhar seu atendimento para nossa equipe responsável."
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-sm">Ação se ninguém estiver disponível</Label>
            <Select value={cfg.fallback_action ?? "keep_ai"} onValueChange={(v: any) => patch({ fallback_action: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="keep_ai">Permanecer com o agente de IA</SelectItem>
                <SelectItem value="another_team">Encaminhar para outra equipe</SelectItem>
                <SelectItem value="callback">Criar solicitação de retorno</SelectItem>
                <SelectItem value="task">Criar tarefa para responsável</SelectItem>
                <SelectItem value="queue">Deixar na fila</SelectItem>
                <SelectItem value="hours">Informar horário de atendimento</SelectItem>
                <SelectItem value="close">Encerrar a conversa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {cfg.fallback_action === "another_team" && (
            <div>
              <Label className="text-sm">Equipe alternativa</Label>
              <Select value={cfg.fallback_team_id ?? ""} onValueChange={(v) => patch({ fallback_team_id: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <SheetFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar configuração</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
