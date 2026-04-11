import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, GripVertical, Pencil, Check, X, Loader2,
  ChevronDown, ChevronUp, Copy, Power, Clock, Hash, Save, Star, Flag, Palette,
  AlertTriangle, ArrowRight, Settings2, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Workspace, KanbanColumn } from "../WorkspacesTab";
import { getTypeConfig, COLUMN_COLORS } from "../WorkspacesTab";

interface Props {
  ws: Workspace;
  columns: Record<string, KanbanColumn[]>;
  setColumns: React.Dispatch<React.SetStateAction<Record<string, KanbanColumn[]>>>;
  expandedWs: Record<string, boolean>;
  setExpandedWs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onEdit: (ws: Workspace) => void;
  onDelete: (ws: Workspace) => void;
  onDuplicate: (ws: Workspace) => void;
  onSetDefault: (ws: Workspace) => void;
  onRefresh: () => void;
}

export function WorkspaceGroupSection({ ws, columns, setColumns, expandedWs, setExpandedWs, onEdit, onDelete, onDuplicate, onSetDefault, onRefresh }: Props) {
  const typeConf = getTypeConfig(ws.type);
  const TypeIcon = typeConf.icon;
  const wsCols = (columns[ws.id] || []).sort((a, b) => a.position - b.position);
  const isExpanded = expandedWs[ws.id] ?? false;
  const seedingRef = useRef(false);

  // Auto-seed default columns when workspace is expanded and has none
  useEffect(() => {
    if (!isExpanded || wsCols.length > 0 || seedingRef.current) return;
    seedingRef.current = true;

    const salesPipeline = [
      { name: "StandBy", position: 0, sla_days: 90, color: "#6B7280", is_default: true },
      { name: "Novos Leads", position: 1, sla_days: 1, color: "#22C55E" },
      { name: "1º Contato", position: 2, sla_days: 5, color: "#3B82F6" },
      { name: "Call/Negócio", position: 3, sla_days: 3, color: "#F59E0B" },
      { name: "Follow-up 1", position: 4, sla_days: 15, color: "#A855F7" },
      { name: "Follow-up 2", position: 5, sla_days: 15, color: "#EC4899" },
      { name: "Contrato Fechado", position: 6, sla_days: 0, color: "#22C55E", is_final: true },
    ];
    const taskPipeline = [
      { name: "A Fazer", position: 0, sla_days: 7, color: "#6B7280", is_default: true },
      { name: "Em Progresso", position: 1, sla_days: 5, color: "#3B82F6" },
      { name: "Concluído", position: 2, sla_days: 0, color: "#22C55E", is_final: true },
    ];
    const suportePipeline = [
      { name: "Novo Ticket", position: 0, sla_days: 1, color: "#6B7280", is_default: true },
      { name: "Em Análise", position: 1, sla_days: 3, color: "#3B82F6" },
      { name: "Em Andamento", position: 2, sla_days: 5, color: "#F59E0B" },
      { name: "Aguardando Retorno", position: 3, sla_days: 7, color: "#A855F7" },
      { name: "Resolvido", position: 4, sla_days: 0, color: "#22C55E", is_final: true },
    ];
    const financeiroPipeline = [
      { name: "Pendente", position: 0, sla_days: 5, color: "#6B7280", is_default: true },
      { name: "Em Análise", position: 1, sla_days: 3, color: "#3B82F6" },
      { name: "Aprovado", position: 2, sla_days: 2, color: "#22C55E" },
      { name: "Pago", position: 3, sla_days: 0, color: "#10B981", is_final: true },
    ];
    const onboardingPipeline = [
      { name: "Cadastro", position: 0, sla_days: 3, color: "#6B7280", is_default: true },
      { name: "Documentação", position: 1, sla_days: 5, color: "#3B82F6" },
      { name: "Validação", position: 2, sla_days: 3, color: "#F59E0B" },
      { name: "Ativação", position: 3, sla_days: 2, color: "#A855F7" },
      { name: "Concluído", position: 4, sla_days: 0, color: "#22C55E", is_final: true },
    ];
    const defaultCols: Record<string, typeof salesPipeline> = {
      vendas: salesPipeline, comercial: salesPipeline, pre_venda_sdr: salesPipeline, crm: salesPipeline,
      task: taskPipeline, suporte: suportePipeline,
      financeiro: financeiroPipeline, contas_pagar: financeiroPipeline, contas_receber: financeiroPipeline, cobranca: financeiroPipeline,
      onboarding: onboardingPipeline, pos_venda: onboardingPipeline,
    };
    const cols = defaultCols[ws.type] || taskPipeline;

    (async () => {
      // Double-check in DB before inserting
      const { data: existing } = await supabase.from("kanban_columns").select("id").eq("workspace_id", ws.id).limit(1);
      if (existing && existing.length > 0) { seedingRef.current = false; onRefresh(); return; }

      const { error } = await supabase.from("kanban_columns").insert(
        cols.map((c) => ({ ...c, workspace_id: ws.id })) as any
      );
      seedingRef.current = false;
      if (error) { console.error("Error seeding columns:", error); return; }
      toast.success(`Colunas padrão criadas para "${ws.name}"`);
      onRefresh();
    })();
  }, [isExpanded, wsCols.length, ws.id, ws.type, ws.name, onRefresh]);

  // Column editing
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColName, setEditColName] = useState("");
  const [editColColor, setEditColColor] = useState("#6B7280");
  const [editColSla, setEditColSla] = useState(7);
  const [editColSlaUnit, setEditColSlaUnit] = useState<"dias" | "horas">("dias");
  const [editColIsDefault, setEditColIsDefault] = useState(false);
  const [editColIsFinal, setEditColIsFinal] = useState(false);
  const [editColActive, setEditColActive] = useState(true);
  const [editColAllowWon, setEditColAllowWon] = useState(false);
  const [newlyAddedColId, setNewlyAddedColId] = useState<string | null>(null);

  // Drag
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Delete col
  const [deleteCol, setDeleteCol] = useState<KanbanColumn | null>(null);
  const [deleteColCount, setDeleteColCount] = useState(0);
  const [reassignColId, setReassignColId] = useState("");
  const [deletingCol, setDeletingCol] = useState(false);

  const startEditColumn = (col: KanbanColumn) => {
    setEditingColId(col.id);
    setEditColName(col.name);
    setEditColColor(col.color);
    const isHours = col.sla_days < 1 && col.sla_days > 0;
    setEditColSlaUnit(isHours ? "horas" : "dias");
    setEditColSla(isHours ? Math.round(col.sla_days * 24) : col.sla_days);
    setEditColIsDefault(col.is_default ?? false);
    setEditColIsFinal(col.is_final ?? false);
    setEditColActive(col.active ?? true);
    setEditColAllowWon(col.allow_mark_as_won ?? false);
  };

  const handleAddColumn = async () => {
    const { data, error } = await supabase.from("kanban_columns").insert({
      workspace_id: ws.id, name: "Nova Etapa", position: wsCols.length,
      sla_days: 7, color: COLUMN_COLORS[wsCols.length % COLUMN_COLORS.length],
    } as any).select().single();
    if (error) toast.error("Erro ao criar coluna");
    else if (data) { setNewlyAddedColId((data as any).id); startEditColumn(data as any); onRefresh(); }
  };

  const handleSaveColumn = async (col: KanbanColumn) => {
    if (!editColName.trim()) { toast.error("Nome obrigatório"); return; }
    if (editColSla < 0) { toast.error("SLA não pode ser negativo"); return; }
    const slaDays = editColSlaUnit === "horas" ? editColSla / 24 : editColSla;
    if (editColIsDefault) await supabase.from("kanban_columns").update({ is_default: false } as any).eq("workspace_id", ws.id);
    const { error } = await supabase.from("kanban_columns")
      .update({ name: editColName, sla_days: slaDays, color: editColColor, is_default: editColIsDefault, is_final: editColIsFinal, active: editColActive, allow_mark_as_won: editColAllowWon } as any)
      .eq("id", col.id);
    if (error) toast.error("Erro ao atualizar"); else toast.success("Coluna atualizada");
    setEditingColId(null); onRefresh();
  };

  const handleDeleteColumnClick = async (col: KanbanColumn) => {
    const { count } = await supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("stage", col.id);
    setDeleteCol(col); setDeleteColCount(count || 0); setReassignColId("");
  };

  const handleConfirmDeleteColumn = async () => {
    if (!deleteCol) return;
    setDeletingCol(true);
    if (deleteColCount > 0) {
      if (!reassignColId) { toast.error("Selecione coluna de destino"); setDeletingCol(false); return; }
      await supabase.from("crm_leads").update({ stage: reassignColId, stage_entered_at: new Date().toISOString() } as any).eq("stage", deleteCol.id);
    }
    const { error } = await supabase.from("kanban_columns").delete().eq("id", deleteCol.id);
    if (error) toast.error("Erro ao excluir"); else { toast.success("Coluna removida"); onRefresh(); }
    setDeleteCol(null); setDeletingCol(false);
  };

  // Drag
  const handleDragEnd = () => {
    if (dragColId && dragOverColId && dragColId !== dragOverColId) {
      const sorted = [...wsCols];
      const fromIdx = sorted.findIndex((c) => c.id === dragColId);
      const toIdx = sorted.findIndex((c) => c.id === dragOverColId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = sorted.splice(fromIdx, 1);
        sorted.splice(toIdx, 0, moved);
        setColumns((prev) => ({ ...prev, [ws.id]: sorted.map((c, i) => ({ ...c, position: i })) }));
        setPendingOrder(true);
      }
    }
    setDragColId(null); setDragOverColId(null);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    const sorted = (columns[ws.id] || []).sort((a, b) => a.position - b.position);
    await Promise.all(sorted.map((c, i) => supabase.from("kanban_columns").update({ position: i } as any).eq("id", c.id)));
    toast.success("Ordem atualizada"); setPendingOrder(false); setSavingOrder(false); onRefresh();
  };

  return (
    <>
      <div className="border border-border/50 rounded-xl bg-card/60 overflow-hidden hover:border-border/80 transition-all">
        {/* WS header */}
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/20 transition-colors" onClick={() => setExpandedWs((p) => ({ ...p, [ws.id]: !p[ws.id] }))}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: ws.color + "18" }}>
            <TypeIcon className="h-4 w-4" style={{ color: ws.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-foreground truncate">{ws.name}</p>
              <Badge variant="outline" className="text-[10px] border-border/50" style={{ color: typeConf.color, borderColor: typeConf.color + "40" }}>{typeConf.label}</Badge>
              {ws.is_default && <Badge className="text-[10px] bg-primary/15 text-primary border-primary/20 hover:bg-primary/15">Padrão</Badge>}
            </div>
            <span className="text-[11px] text-muted-foreground">{wsCols.length} {wsCols.length === 1 ? "coluna" : "colunas"}</span>
          </div>
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            {!ws.is_default && <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onSetDefault(ws)}><Power className="h-3 w-3" /></Button>}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onDuplicate(ws)}><Copy className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(ws)}><Pencil className="h-3 w-3" /></Button>
            {!ws.is_default && <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(ws)}><Trash2 className="h-3 w-3" /></Button>}
          </div>
          <div className="text-muted-foreground">{isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</div>
        </div>

        {/* Kanban columns */}
        {isExpanded && (
          <div className="border-t border-border/30 px-4 py-3 bg-muted/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Colunas do Kanban</span>
              </div>
              {pendingOrder && (
                <Button size="sm" className="h-6 text-[10px] gap-1 bg-gradient-to-r from-primary to-blue-600" onClick={handleSaveOrder} disabled={savingOrder}>
                  {savingOrder ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar Ordem
                </Button>
              )}
            </div>

            {wsCols.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <Settings2 className="h-5 w-5 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground mb-2">Nenhuma coluna criada</p>
                <Button size="sm" variant="outline" className="gap-1 text-[11px] h-7" onClick={handleAddColumn}><Plus className="h-3 w-3" /> Criar coluna</Button>
              </div>
            ) : (
              <div className="overflow-x-auto pb-1 -mx-1">
                <div className="flex gap-2.5 min-w-max px-1">
                  {wsCols.map((col, idx) => {
                    const isEditing = editingColId === col.id;
                    const isDragging = dragColId === col.id;
                    const isDragOver = dragOverColId === col.id && dragColId !== col.id;

                    return (
                      <div
                        key={col.id}
                        draggable={!isEditing}
                        onDragStart={() => { setDragColId(col.id); }}
                        onDragOver={(e) => { e.preventDefault(); if (dragOverColId !== col.id) setDragOverColId(col.id); }}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex flex-col rounded-xl border transition-all duration-200 shrink-0",
                          isEditing ? "w-[240px] border-primary/30 shadow-lg bg-card" : "w-[180px] bg-card/60 border-border/40 hover:border-border/70",
                          isDragging && "opacity-40 scale-95",
                          isDragOver && "border-primary/50 bg-primary/5 shadow-md scale-[1.02]",
                          !(col.active ?? true) && "opacity-50",
                        )}
                      >
                        <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: col.color }} />
                        <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-border/20">
                          <div className={cn("cursor-grab active:cursor-grabbing text-muted-foreground/40", isEditing && "pointer-events-none opacity-30")}>
                            <GripVertical className="h-3 w-3" />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground/40">{idx + 1}</span>
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                          {!isEditing && <span className="text-[11px] font-semibold text-foreground truncate flex-1">{col.name}</span>}
                          <div className="flex items-center gap-0.5 ml-auto">
                            {(col.is_default ?? false) && <span title="Etapa padrão"><Star className="h-2.5 w-2.5 text-yellow-500" /></span>}
                            {(col.is_final ?? false) && <span title="Etapa final"><Flag className="h-2.5 w-2.5 text-red-500" /></span>}
                            {(col.allow_mark_as_won ?? false) && <span title="Permite ganho"><Trophy className="h-2.5 w-2.5 text-emerald-500" /></span>}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="px-2.5 py-2.5 space-y-2.5">
                            <div className="space-y-1">
                              <Label className="text-[9px] text-muted-foreground">Nome</Label>
                              <Input value={editColName} onChange={(e) => setEditColName(e.target.value)} className="h-7 text-[11px]" autoFocus onKeyDown={(e) => e.key === "Enter" && handleSaveColumn(col)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] text-muted-foreground flex items-center gap-1"><Palette className="h-2.5 w-2.5" /> Cor</Label>
                              <div className="flex gap-1 flex-wrap">
                                {COLUMN_COLORS.map((c) => (
                                  <button key={c} onClick={() => setEditColColor(c)} className={cn("h-4 w-4 rounded-full border-2 transition-all", editColColor === c ? "border-foreground scale-125" : "border-transparent hover:scale-110")} style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> SLA</Label>
                              <div className="flex items-center gap-1">
                                <Input type="number" value={editColSla} onChange={(e) => setEditColSla(Number(e.target.value))} className="h-6 text-[11px] w-14 text-center" min={0} />
                                <Select value={editColSlaUnit} onValueChange={(v) => setEditColSlaUnit(v as "dias" | "horas")}>
                                  <SelectTrigger className="h-6 w-[55px] text-[9px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="dias">dias</SelectItem>
                                    <SelectItem value="horas">horas</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex items-center justify-between"><Label className="text-[9px] text-muted-foreground">Padrão</Label><Switch checked={editColIsDefault} onCheckedChange={setEditColIsDefault} className="scale-[0.65]" /></div>
                              <div className="flex items-center justify-between"><Label className="text-[9px] text-muted-foreground">Final</Label><Switch checked={editColIsFinal} onCheckedChange={setEditColIsFinal} className="scale-[0.65]" /></div>
                              <div className="flex items-center justify-between"><Label className="text-[9px] text-muted-foreground">Ativa</Label><Switch checked={editColActive} onCheckedChange={setEditColActive} className="scale-[0.65]" /></div>
                              <div className="flex items-center justify-between"><Label className="text-[9px] text-muted-foreground flex items-center gap-1"><Trophy className="h-2.5 w-2.5 text-emerald-500" /> Permitir ganho</Label><Switch checked={editColAllowWon} onCheckedChange={setEditColAllowWon} className="scale-[0.65]" /></div>
                            </div>
                            <div className="flex gap-1 pt-0.5">
                              <Button size="sm" className="flex-1 h-6 text-[10px] gap-1 bg-gradient-to-r from-primary to-blue-600" onClick={() => handleSaveColumn(col)}><Check className="h-2.5 w-2.5" /> Salvar</Button>
                              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setEditingColId(null)}><X className="h-2.5 w-2.5" /></Button>
                            </div>
                          </div>
                        ) : (
                          <div className="px-2.5 py-2 space-y-1.5">
                            <Badge variant="outline" className="text-[9px] font-mono border-border/40 text-muted-foreground">
                              <Clock className="h-2 w-2 mr-1" />
                              {col.sla_days < 1 && col.sla_days > 0 ? `${Math.round(col.sla_days * 24)}h` : `${col.sla_days}d`}
                            </Badge>
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted" onClick={() => startEditColumn(col)}><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive/10" onClick={() => handleDeleteColumnClick(col)}><Trash2 className="h-2.5 w-2.5 text-muted-foreground" /></Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button onClick={handleAddColumn} className="flex flex-col items-center justify-center w-[120px] shrink-0 rounded-xl border-2 border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all min-h-[100px] gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span className="text-[10px] font-medium">Adicionar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete column dialog */}
      <Dialog open={!!deleteCol} onOpenChange={(o) => { if (!o) { setDeleteCol(null); setDeleteColCount(0); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deleteColCount > 0 ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> : <Trash2 className="h-5 w-5 text-destructive" />}
              Excluir coluna "{deleteCol?.name}"
            </DialogTitle>
            <DialogDescription>
              {deleteColCount > 0
                ? `${deleteColCount} card${deleteColCount > 1 ? "s" : ""} vinculado${deleteColCount > 1 ? "s" : ""}. Selecione para onde movê-los.`
                : "Coluna será removida permanentemente."
              }
            </DialogDescription>
          </DialogHeader>
          {deleteColCount > 0 && deleteCol && (
            <div className="space-y-2 py-2">
              <Label className="text-xs flex items-center gap-1.5"><ArrowRight className="h-3 w-3" /> Mover para:</Label>
              <Select value={reassignColId} onValueChange={setReassignColId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(columns[deleteCol.workspace_id] || []).filter((c) => c.id !== deleteCol.id).sort((a, b) => a.position - b.position).map((c) => (
                    <SelectItem key={c.id} value={c.id}><span className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteCol(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteColumn} disabled={deletingCol || (deleteColCount > 0 && !reassignColId)}>
              {deletingCol && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {deleteColCount > 0 ? "Mover e excluir" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
