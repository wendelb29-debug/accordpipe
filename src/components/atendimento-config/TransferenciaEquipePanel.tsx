import { useMemo, useState } from "react";
import { useAgentTeams, type Team, type AgentTeam } from "@/hooks/useAgentTeams";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, GripVertical, Trash2, Settings2, Search, Check, Users, ArrowRight } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TransferenciaEquipeConfigSheet } from "./TransferenciaEquipeConfigSheet";
import { cn } from "@/lib/utils";

export function TransferenciaEquipePanel() {
  const {
    teams, agentTeams, transferEnabled, loading,
    selectedTeamIds, setSelectedTeams, reorder, toggleEnabled, remove, updateConfig, setTransferSwitch,
  } = useAgentTeams();

  const [search, setSearch] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const filteredTeams = useMemo(
    () => teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) && t.status !== "deleted"),
    [teams, search],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const orderedRows = useMemo(
    () => [...agentTeams].sort((a, b) => a.position - b.position),
    [agentTeams],
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = orderedRows.map((r) => r.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newIds = arrayMove(ids, oldIndex, newIndex);
    reorder(newIds);
  };

  const configRow = orderedRows.find((r) => r.id === configId) ?? null;

  if (loading) {
    return (
      <div className="py-10 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header do bloco com switch mestre */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground">Transferência para equipe</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Permita que o agente encaminhe uma conversa para uma equipe de atendimento quando for necessário.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <Label htmlFor="transfer-switch" className="text-sm font-medium">Permitir transferência</Label>
          <Switch id="transfer-switch" checked={transferEnabled} onCheckedChange={setTransferSwitch} />
        </div>
      </div>

      <div className={cn("space-y-5 transition-opacity", !transferEnabled && "opacity-50 pointer-events-none")}>
        {/* Seletor */}
        <div>
          <Label className="text-sm font-medium">Equipes disponíveis para o agente</Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Selecione as equipes para as quais este agente poderá transferir um atendimento.
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-11">
                <span className="text-muted-foreground">
                  {orderedRows.length ? `${orderedRows.length} equipe(s) selecionada(s)` : "Selecionar equipes…"}
                </span>
                <Users className="h-4 w-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-0" align="start">
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar equipe…" className="pl-8 h-9" />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {filteredTeams.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Nenhuma equipe encontrada. Crie uma em "Equipes do chatbot".
                  </div>
                )}
                {filteredTeams.map((t) => {
                  const checked = selectedTeamIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        const next = checked
                          ? Array.from(selectedTeamIds).filter((id) => id !== t.id)
                          : [...selectedTeamIds, t.id];
                        setSelectedTeams(next);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left"
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                        checked ? "bg-primary border-primary" : "border-border",
                      )}>
                        {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0" style={{ background: `${t.color}22`, color: t.color }}>
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{t.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t.member_count} membro(s) · {t.status === "active" ? "ativo" : t.status}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Lista com drag-and-drop */}
        {orderedRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground mt-3">
              Nenhuma equipe vinculada. Selecione acima para começar.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Arraste para reordenar — a ordem define a prioridade que o agente considera na hora de transferir.
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {orderedRows.map((row, idx) => {
                    const team = teamById.get(row.team_id);
                    if (!team) return null;
                    return (
                      <SortableRow
                        key={row.id}
                        row={row}
                        team={team}
                        order={idx + 1}
                        onToggle={(v) => toggleEnabled(row.id, v)}
                        onConfig={() => setConfigId(row.id)}
                        onRemove={() => remove(row.id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {!transferEnabled && (
          <p className="text-xs text-muted-foreground italic">A transferência para equipe está desativada. As configurações abaixo permanecem salvas.</p>
        )}
      </div>

      <TransferenciaEquipeConfigSheet
        open={!!configRow}
        row={configRow}
        team={configRow ? teamById.get(configRow.team_id) ?? null : null}
        teams={teams.filter((t) => t.id !== configRow?.team_id)}
        onClose={() => setConfigId(null)}
        onSave={(cfg) => configRow && updateConfig(configRow.id, cfg)}
      />
    </div>
  );
}

function SortableRow({
  row, team, order, onToggle, onConfig, onRemove,
}: {
  row: AgentTeam;
  team: Team;
  order: number;
  onToggle: (v: boolean) => void;
  onConfig: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const priorityLabel = (row.config?.priority ?? "medium") as "high" | "medium" | "low";

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
        <GripVertical className="h-4 w-4" />
      </button>
      <Badge variant="outline" className="h-6 min-w-6 justify-center px-1.5 text-xs font-mono">{order}</Badge>
      <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0" style={{ background: `${team.color}22`, color: team.color }}>
        <Users className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{team.name}</span>
          <Badge className={cn(
            "text-[10px] px-1.5 h-4 border-0",
            priorityLabel === "high" && "bg-red-500/15 text-red-600",
            priorityLabel === "medium" && "bg-amber-500/15 text-amber-600",
            priorityLabel === "low" && "bg-slate-500/15 text-slate-600",
          )}>
            {priorityLabel === "high" ? "Alta" : priorityLabel === "medium" ? "Média" : "Baixa"}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {team.member_count} membro(s) · {team.description || "sem descrição"}
          {row.config?.fallback_action === "another_team" && row.config?.fallback_team_id && (
            <span className="inline-flex items-center gap-1 ml-2 text-primary/80">
              <ArrowRight className="h-3 w-3" /> fallback
            </span>
          )}
        </div>
      </div>
      <Switch checked={row.is_enabled} onCheckedChange={onToggle} />
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onConfig} title="Configurar">
        <Settings2 className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onRemove} title="Remover">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
