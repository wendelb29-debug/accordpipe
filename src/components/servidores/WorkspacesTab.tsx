import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, GripVertical, Pencil, Check, X, Briefcase, BarChart3, Settings2, Loader2,
  ChevronDown, ChevronUp, Copy, Power, Layers, Clock, Hash, Sparkles,
  HeadphonesIcon, DollarSign, Users, Cog, LayoutGrid, Save, Star, Flag, Palette,
  AlertTriangle, ArrowRight,
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Workspace {
  id: string;
  name: string;
  servidor_id: string;
  color: string;
  icon: string;
  type: string;
  is_default: boolean;
}

interface KanbanColumn {
  id: string;
  workspace_id: string;
  name: string;
  position: number;
  sla_days: number;
  color: string;
  icon: string;
  is_default: boolean;
  is_final: boolean;
  active: boolean;
}

const WORKSPACE_COLORS = [
  "#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626",
  "#DB2777", "#4F46E5", "#0891B2", "#65A30D", "#F59E0B",
];

const COLUMN_COLORS = [
  "#6B7280", "#22C55E", "#3B82F6", "#F59E0B", "#A855F7",
  "#EC4899", "#EF4444", "#14B8A6", "#8B5CF6", "#F97316",
];

const WORKSPACE_TYPES = [
  { value: "vendas", label: "Vendas", icon: BarChart3, color: "#7C3AED" },
  { value: "crm", label: "CRM", icon: Users, color: "#2563EB" },
  { value: "suporte", label: "Suporte", icon: HeadphonesIcon, color: "#059669" },
  { value: "financeiro", label: "Financeiro", icon: DollarSign, color: "#D97706" },
  { value: "rh", label: "RH", icon: Users, color: "#DB2777" },
  { value: "operacional", label: "Operacional", icon: Cog, color: "#0891B2" },
  { value: "task", label: "Task", icon: LayoutGrid, color: "#65A30D" },
  { value: "custom", label: "Personalizado", icon: Sparkles, color: "#F59E0B" },
];

function getTypeConfig(type: string) {
  return WORKSPACE_TYPES.find((t) => t.value === type) || WORKSPACE_TYPES[WORKSPACE_TYPES.length - 1];
}

export function WorkspacesTab({ companyId }: { companyId: string | null }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [columns, setColumns] = useState<Record<string, KanbanColumn[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWs, setEditingWs] = useState<Workspace | null>(null);
  const [wsName, setWsName] = useState("");
  const [wsColor, setWsColor] = useState("#7C3AED");
  const [wsType, setWsType] = useState("vendas");
  const [saving, setSaving] = useState(false);
  const [expandedWs, setExpandedWs] = useState<Record<string, boolean>>({});
  const [deleteWs, setDeleteWs] = useState<Workspace | null>(null);

  // Column editing
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColName, setEditColName] = useState("");
  const [editColColor, setEditColColor] = useState("#6B7280");
  const [editColSla, setEditColSla] = useState(7);
  const [editColSlaUnit, setEditColSlaUnit] = useState<"dias" | "horas">("dias");
  const [editColIsDefault, setEditColIsDefault] = useState(false);
  const [editColIsFinal, setEditColIsFinal] = useState(false);
  const [editColActive, setEditColActive] = useState(true);
  const [newlyAddedColId, setNewlyAddedColId] = useState<string | null>(null);

  // Drag and drop
  const [dragWsId, setDragWsId] = useState<string | null>(null);
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [pendingOrderChanges, setPendingOrderChanges] = useState<Record<string, boolean>>({});
  const [savingOrder, setSavingOrder] = useState<string | null>(null);

  // Delete column with reassignment
  const [deleteCol, setDeleteCol] = useState<KanbanColumn | null>(null);
  const [deleteColLinkedCount, setDeleteColLinkedCount] = useState(0);
  const [reassignColId, setReassignColId] = useState<string>("");
  const [deletingCol, setDeletingCol] = useState(false);

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data: wsData } = await supabase
      .from("workspaces")
      .select("*")
      .eq("servidor_id", companyId)
      .order("is_default", { ascending: false })
      .order("name");

    const ws = (wsData || []) as Workspace[];
    setWorkspaces(ws);

    if (ws.length > 0) {
      const wsIds = ws.map((w) => w.id);
      const { data: colData } = await supabase
        .from("kanban_columns")
        .select("*")
        .in("workspace_id", wsIds)
        .order("position");

      const grouped: Record<string, KanbanColumn[]> = {};
      (colData || []).forEach((c: any) => {
        if (!grouped[c.workspace_id]) grouped[c.workspace_id] = [];
        grouped[c.workspace_id].push(c as KanbanColumn);
      });
      setColumns(grouped);
    } else {
      setColumns({});
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (newlyAddedColId) {
      const t = setTimeout(() => setNewlyAddedColId(null), 2000);
      return () => clearTimeout(t);
    }
  }, [newlyAddedColId]);

  const toggleExpand = (id: string) => setExpandedWs((prev) => ({ ...prev, [id]: !prev[id] }));

  const openCreateDialog = () => {
    setEditingWs(null); setWsName(""); setWsColor("#7C3AED"); setWsType("vendas"); setDialogOpen(true);
  };

  const openEditDialog = (ws: Workspace) => {
    setEditingWs(ws); setWsName(ws.name); setWsColor(ws.color); setWsType(ws.type); setDialogOpen(true);
  };

  const handleSaveWorkspace = async () => {
    if (!wsName.trim() || !companyId) return;
    setSaving(true);
    if (editingWs) {
      const { error } = await supabase.from("workspaces").update({ name: wsName.trim(), color: wsColor, type: wsType } as any).eq("id", editingWs.id);
      if (error) toast.error("Erro ao atualizar workspace"); else toast.success("Workspace atualizado!");
    } else {
      const { data, error } = await supabase.from("workspaces")
        .insert({ name: wsName.trim(), servidor_id: companyId, color: wsColor, type: wsType, is_default: workspaces.length === 0 } as any)
        .select().single();
      if (error) toast.error("Erro ao criar workspace");
      else {
        toast.success(`Workspace "${wsName.trim()}" criado!`);
        const defaultColsByType: Record<string, { name: string; position: number; sla_days: number; color: string; is_default?: boolean; is_final?: boolean }[]> = {
          vendas: [
            { name: "StandBy", position: 0, sla_days: 90, color: "#6B7280", is_default: true },
            { name: "Novos Leads", position: 1, sla_days: 1, color: "#22C55E" },
            { name: "1º Contato", position: 2, sla_days: 5, color: "#3B82F6" },
            { name: "Call/Negócio", position: 3, sla_days: 3, color: "#F59E0B" },
            { name: "Follow-up 1", position: 4, sla_days: 15, color: "#A855F7" },
            { name: "Follow-up 2", position: 5, sla_days: 15, color: "#EC4899" },
            { name: "Proposta", position: 6, sla_days: 7, color: "#EF4444" },
          ],
          task: [
            { name: "A Fazer", position: 0, sla_days: 7, color: "#6B7280", is_default: true },
            { name: "Em Progresso", position: 1, sla_days: 5, color: "#3B82F6" },
            { name: "Concluído", position: 2, sla_days: 0, color: "#22C55E", is_final: true },
          ],
        };
        const cols = defaultColsByType[wsType];
        if (cols && data) {
          await supabase.from("kanban_columns").insert(
            cols.map((c) => ({ ...c, workspace_id: (data as any).id })) as any
          );
        }
        if (data) setExpandedWs((p) => ({ ...p, [(data as any).id]: true }));
      }
    }
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteWs) return;
    const { error } = await supabase.from("workspaces").delete().eq("id", deleteWs.id);
    if (error) toast.error("Erro ao excluir"); else { toast.success("Workspace excluído!"); fetchData(); }
    setDeleteWs(null);
  };

  const handleDuplicateWorkspace = async (ws: Workspace) => {
    if (!companyId) return;
    const { data, error } = await supabase.from("workspaces")
      .insert({ name: `${ws.name} (cópia)`, servidor_id: companyId, color: ws.color, type: ws.type, is_default: false } as any)
      .select().single();
    if (error) { toast.error("Erro ao duplicar"); return; }
    const wsCols = columns[ws.id] || [];
    if (wsCols.length > 0 && data) {
      await supabase.from("kanban_columns").insert(
        wsCols.map((c) => ({ workspace_id: (data as any).id, name: c.name, position: c.position, sla_days: c.sla_days, color: c.color, is_default: c.is_default, is_final: c.is_final, active: c.active })) as any
      );
    }
    toast.success("Workspace duplicado!");
    if (data) setExpandedWs((p) => ({ ...p, [(data as any).id]: true }));
    fetchData();
  };

  const handleSetDefault = async (ws: Workspace) => {
    if (!companyId) return;
    await supabase.from("workspaces").update({ is_default: false } as any).eq("servidor_id", companyId);
    await supabase.from("workspaces").update({ is_default: true } as any).eq("id", ws.id);
    toast.success(`"${ws.name}" definido como padrão`);
    fetchData();
  };

  // Column CRUD
  const handleAddColumn = async (workspaceId: string) => {
    const currentCols = columns[workspaceId] || [];
    const { data, error } = await supabase.from("kanban_columns").insert({
      workspace_id: workspaceId,
      name: "Nova Etapa",
      position: currentCols.length,
      sla_days: 7,
      color: COLUMN_COLORS[currentCols.length % COLUMN_COLORS.length],
    } as any).select().single();
    if (error) toast.error("Erro ao criar coluna");
    else if (data) {
      setNewlyAddedColId((data as any).id);
      startEditColumn(data as any as KanbanColumn);
      fetchData();
    }
  };

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
  };

  const handleSaveColumn = async (col: KanbanColumn) => {
    if (!editColName.trim()) { toast.error("Nome da coluna é obrigatório"); return; }
    if (editColSla < 0) { toast.error("SLA não pode ser negativo"); return; }
    const slaDaysValue = editColSlaUnit === "horas" ? editColSla / 24 : editColSla;

    // If setting as default, unset others in workspace
    if (editColIsDefault) {
      await supabase.from("kanban_columns").update({ is_default: false } as any).eq("workspace_id", col.workspace_id);
    }

    const { error } = await supabase.from("kanban_columns")
      .update({ name: editColName, sla_days: slaDaysValue, color: editColColor, is_default: editColIsDefault, is_final: editColIsFinal, active: editColActive } as any)
      .eq("id", col.id);
    if (error) toast.error("Erro ao atualizar coluna");
    else toast.success("Coluna atualizada");
    setEditingColId(null);
    fetchData();
  };

  const handleDeleteColumnClick = async (col: KanbanColumn) => {
    const { count } = await supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("stage", col.id);
    setDeleteCol(col);
    setDeleteColLinkedCount(count || 0);
    setReassignColId("");
  };

  const handleConfirmDeleteColumn = async () => {
    if (!deleteCol) return;
    setDeletingCol(true);

    if (deleteColLinkedCount > 0) {
      if (!reassignColId) { toast.error("Selecione uma coluna de destino para os cards"); setDeletingCol(false); return; }
      // Move leads to new column
      const { error: moveErr } = await supabase.from("crm_leads")
        .update({ stage: reassignColId, stage_entered_at: new Date().toISOString() } as any)
        .eq("stage", deleteCol.id);
      if (moveErr) { toast.error("Erro ao mover cards"); setDeletingCol(false); return; }
    }

    const { error } = await supabase.from("kanban_columns").delete().eq("id", deleteCol.id);
    if (error) toast.error("Erro ao excluir coluna");
    else { toast.success("Coluna removida com sucesso."); fetchData(); }
    setDeleteCol(null);
    setDeletingCol(false);
  };

  // Drag and drop
  const handleDragStart = (wsId: string, colId: string) => { setDragWsId(wsId); setDragColId(colId); };
  const handleDragOver = (e: React.DragEvent, colId: string) => { e.preventDefault(); if (dragOverColId !== colId) setDragOverColId(colId); };
  const handleDragEnd = () => {
    if (dragWsId && dragColId && dragOverColId && dragColId !== dragOverColId) {
      const wsCols = [...(columns[dragWsId] || [])].sort((a, b) => a.position - b.position);
      const fromIdx = wsCols.findIndex((c) => c.id === dragColId);
      const toIdx = wsCols.findIndex((c) => c.id === dragOverColId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = wsCols.splice(fromIdx, 1);
        wsCols.splice(toIdx, 0, moved);
        const reordered = wsCols.map((c, i) => ({ ...c, position: i }));
        setColumns((prev) => ({ ...prev, [dragWsId!]: reordered }));
        setPendingOrderChanges((prev) => ({ ...prev, [dragWsId!]: true }));
      }
    }
    setDragColId(null); setDragOverColId(null); setDragWsId(null);
  };

  const handleSaveOrder = async (workspaceId: string) => {
    const wsCols = (columns[workspaceId] || []).sort((a, b) => a.position - b.position);
    if (wsCols.length === 0) return;
    setSavingOrder(workspaceId);
    const updates = wsCols.map((col, idx) => supabase.from("kanban_columns").update({ position: idx } as any).eq("id", col.id));
    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) toast.error("Erro ao salvar ordem das colunas");
    else { toast.success("Ordem das colunas atualizada com sucesso."); setPendingOrderChanges((prev) => ({ ...prev, [workspaceId]: false })); }
    setSavingOrder(null); fetchData();
  };

  if (!companyId) return <p className="text-sm text-muted-foreground text-center py-8">Salve o tenant primeiro para configurar workspaces.</p>;
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground">Carregando workspaces...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Workspaces do Tenant
          </h3>
          <p className="text-xs text-muted-foreground">Gerencie departamentos, pipelines e funis Kanban do ambiente</p>
        </div>
        <Button size="sm" onClick={openCreateDialog} className="gap-1.5 bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 shadow-lg shadow-primary/20">
          <Plus className="h-3.5 w-3.5" /> Novo Workspace
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-2xl bg-muted/20">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Briefcase className="h-7 w-7 text-primary/60" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Nenhum workspace criado</p>
          <p className="text-xs text-muted-foreground mb-4">Crie seu primeiro workspace para organizar departamentos e pipelines.</p>
          <Button size="sm" onClick={openCreateDialog} variant="outline" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Criar primeiro workspace
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {workspaces.map((ws) => {
            const typeConf = getTypeConfig(ws.type);
            const TypeIcon = typeConf.icon;
            const wsCols = (columns[ws.id] || []).sort((a, b) => a.position - b.position);
            const isExpanded = expandedWs[ws.id] ?? false;
            const hasPendingOrder = pendingOrderChanges[ws.id] ?? false;
            const isSavingOrder = savingOrder === ws.id;

            return (
              <div key={ws.id} className="border border-border/60 rounded-2xl bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Card header */}
                <div className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(ws.id)}>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: ws.color + "18", border: `1px solid ${ws.color}30` }}>
                    <TypeIcon className="h-5 w-5" style={{ color: ws.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate">{ws.name}</p>
                      <Badge variant="outline" className="text-[10px] font-medium border-border/50" style={{ color: typeConf.color, borderColor: typeConf.color + "40" }}>{typeConf.label}</Badge>
                      {ws.is_default && <Badge className="text-[10px] bg-primary/15 text-primary border-primary/20 hover:bg-primary/15">Padrão</Badge>}
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Hash className="h-3 w-3" /> {wsCols.length} {wsCols.length === 1 ? "coluna" : "colunas"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {!ws.is_default && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Definir como padrão" onClick={() => handleSetDefault(ws)}><Power className="h-3.5 w-3.5" /></Button>}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Duplicar" onClick={() => handleDuplicateWorkspace(ws)}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Editar" onClick={() => openEditDialog(ws)}><Pencil className="h-3.5 w-3.5" /></Button>
                    {!ws.is_default && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Excluir" onClick={() => setDeleteWs(ws)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>

                  <div className="text-muted-foreground ml-1">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded: Horizontal pipeline configurator */}
                {isExpanded && (
                  <div className="border-t border-border/40 px-5 py-4 bg-muted/10 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Colunas do Kanban</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{wsCols.length} {wsCols.length === 1 ? "etapa" : "etapas"}</Badge>
                        {hasPendingOrder && (
                          <Button size="sm" className="h-7 text-[11px] gap-1.5 bg-gradient-to-r from-primary to-blue-600" onClick={() => handleSaveOrder(ws.id)} disabled={isSavingOrder}>
                            {isSavingOrder ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar Ordem
                          </Button>
                        )}
                      </div>
                    </div>

                    {wsCols.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border/40 rounded-xl bg-muted/10">
                        <Settings2 className="h-8 w-8 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground mb-1">Nenhuma coluna criada ainda</p>
                        <p className="text-xs text-muted-foreground/70 mb-4">Adicione as etapas deste funil para começar a organizar o CRM.</p>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleAddColumn(ws.id)}>
                          <Plus className="h-3.5 w-3.5" /> Criar primeira coluna
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto pb-2 -mx-1">
                        <div className="flex gap-3 min-w-max px-1">
                          {wsCols.map((col, idx) => {
                            const isEditing = editingColId === col.id;
                            const isNew = newlyAddedColId === col.id;
                            const isDragging = dragColId === col.id;
                            const isDragOver = dragOverColId === col.id && dragColId !== col.id;

                            return (
                              <div
                                key={col.id}
                                draggable={!isEditing}
                                onDragStart={() => handleDragStart(ws.id, col.id)}
                                onDragOver={(e) => handleDragOver(e, col.id)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                  "flex flex-col rounded-xl border transition-all duration-200 w-[200px] shrink-0",
                                  isEditing ? "w-[260px] border-primary/30 shadow-lg shadow-primary/10 bg-card" : "bg-card/60 border-border/40 hover:border-border/70",
                                  isNew && !isEditing && "ring-2 ring-primary/30",
                                  isDragging && "opacity-40 scale-95",
                                  isDragOver && "border-primary/50 bg-primary/5 shadow-md scale-[1.02]",
                                  !(col.active ?? true) && "opacity-50",
                                )}
                              >
                                {/* Column color bar */}
                                <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: col.color }} />

                                {/* Column header */}
                                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30">
                                  <div
                                    className={cn("cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground", isEditing && "pointer-events-none opacity-30")}
                                    title="Arrastar para reordenar"
                                  >
                                    <GripVertical className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-[10px] font-mono text-muted-foreground/40 w-4 text-center shrink-0">{idx + 1}</span>
                                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                                  {!isEditing && (
                                    <span className="text-xs font-semibold text-foreground truncate flex-1">{col.name}</span>
                                  )}
                                  <div className="flex items-center gap-0.5 ml-auto">
                                    {(col.is_default ?? false) && <span title="Etapa padrão"><Star className="h-3 w-3 text-yellow-500" /></span>}
                                    {(col.is_final ?? false) && <span title="Etapa final"><Flag className="h-3 w-3 text-red-500" /></span>}
                                  </div>
                                </div>

                                {isEditing ? (
                                  <div className="px-3 py-3 space-y-3">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground">Nome da Etapa</Label>
                                      <Input value={editColName} onChange={(e) => setEditColName(e.target.value)} className="h-8 text-xs" placeholder="Nome da etapa" autoFocus onKeyDown={(e) => e.key === "Enter" && handleSaveColumn(col)} />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Palette className="h-3 w-3" /> Cor da Etapa</Label>
                                      <div className="flex gap-1.5 flex-wrap">
                                        {COLUMN_COLORS.map((c) => (
                                          <button key={c} onClick={() => setEditColColor(c)} className={cn("h-5 w-5 rounded-full border-2 transition-all", editColColor === c ? "border-foreground scale-125 shadow-md" : "border-transparent hover:scale-110")} style={{ backgroundColor: c }} />
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> SLA</Label>
                                      <div className="flex items-center gap-1.5">
                                        <Input type="number" value={editColSla} onChange={(e) => setEditColSla(Number(e.target.value))} className="h-7 text-xs w-16 text-center" min={0} />
                                        <Select value={editColSlaUnit} onValueChange={(v) => setEditColSlaUnit(v as "dias" | "horas")}>
                                          <SelectTrigger className="h-7 w-[65px] text-[10px]"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="dias">dias</SelectItem>
                                            <SelectItem value="horas">horas</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <div className="space-y-2 pt-1">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-[10px] text-muted-foreground">Etapa padrão</Label>
                                        <Switch checked={editColIsDefault} onCheckedChange={setEditColIsDefault} className="scale-75" />
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <Label className="text-[10px] text-muted-foreground">Etapa final</Label>
                                        <Switch checked={editColIsFinal} onCheckedChange={setEditColIsFinal} className="scale-75" />
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <Label className="text-[10px] text-muted-foreground">Etapa ativa</Label>
                                        <Switch checked={editColActive} onCheckedChange={setEditColActive} className="scale-75" />
                                      </div>
                                    </div>
                                    <div className="flex gap-1.5 pt-1">
                                      <Button size="sm" className="flex-1 h-7 text-[11px] gap-1 bg-gradient-to-r from-primary to-blue-600" onClick={() => handleSaveColumn(col)}>
                                        <Check className="h-3 w-3" /> Salvar
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEditingColId(null)}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="px-3 py-2.5 space-y-2">
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant="outline" className="text-[10px] font-mono border-border/40 text-muted-foreground">
                                        <Clock className="h-2.5 w-2.5 mr-1" />
                                        {col.sla_days < 1 && col.sla_days > 0 ? `${Math.round(col.sla_days * 24)}h` : `${col.sla_days}d`}
                                      </Badge>
                                      {!(col.active ?? true) && <Badge variant="outline" className="text-[10px] text-muted-foreground/50 border-border/30">Inativa</Badge>}
                                    </div>
                                    <div className="flex items-center gap-1 pt-1">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted" onClick={() => startEditColumn(col)} title="Editar">
                                        <Pencil className="h-3 w-3 text-muted-foreground" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10" onClick={() => handleDeleteColumnClick(col)} title="Excluir">
                                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Add column card */}
                          <button
                            onClick={() => handleAddColumn(ws.id)}
                            className="flex flex-col items-center justify-center w-[160px] shrink-0 rounded-xl border-2 border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 min-h-[120px] gap-2"
                          >
                            <Plus className="h-5 w-5" />
                            <span className="text-[11px] font-medium">Adicionar coluna</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Workspace Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Layers className="h-4 w-4 text-primary" /></div>
              {editingWs ? "Editar Workspace" : "Novo Workspace"}
            </DialogTitle>
            <DialogDescription>{editingWs ? "Atualize as informações do workspace." : "Configure um novo departamento ou pipeline para o tenant."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Nome do Workspace</Label>
              <Input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="Ex: Comercial, Marketing, Suporte..." autoFocus className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tipo</Label>
              <Select value={wsType} onValueChange={setWsType}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORKSPACE_TYPES.map((t) => {
                    const Icon = t.icon;
                    return <SelectItem key={t.value} value={t.value}><span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" style={{ color: t.color }} />{t.label}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Cor de Identificação</Label>
              <div className="flex gap-2 flex-wrap">
                {WORKSPACE_COLORS.map((c) => (
                  <button key={c} onClick={() => setWsColor(c)} className={cn("h-8 w-8 rounded-lg border-2 transition-all duration-150", wsColor === c ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105 hover:border-border")} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveWorkspace} disabled={!wsName.trim() || saving} className="gap-1.5 bg-gradient-to-r from-primary to-blue-600">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {saving ? "Salvando..." : editingWs ? "Salvar Alterações" : "Criar Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete workspace */}
      <AlertDialog open={!!deleteWs} onOpenChange={(o) => !o && setDeleteWs(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir workspace "{deleteWs?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todas as colunas do kanban deste workspace serão removidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkspace} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete column with reassignment */}
      <Dialog open={!!deleteCol} onOpenChange={(o) => { if (!o) { setDeleteCol(null); setDeleteColLinkedCount(0); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deleteColLinkedCount > 0 ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> : <Trash2 className="h-5 w-5 text-destructive" />}
              Excluir coluna "{deleteCol?.name}"
            </DialogTitle>
            <DialogDescription>
              {deleteColLinkedCount > 0
                ? `Esta coluna possui ${deleteColLinkedCount} oportunidade${deleteColLinkedCount > 1 ? "s" : ""} vinculada${deleteColLinkedCount > 1 ? "s" : ""}. Para excluir, selecione para qual etapa os cards devem ser movidos.`
                : "Esta coluna será removida permanentemente. Esta ação não pode ser desfeita."
              }
            </DialogDescription>
          </DialogHeader>
          {deleteColLinkedCount > 0 && deleteCol && (
            <div className="space-y-2 py-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3" /> Mover cards para:
              </Label>
              <Select value={reassignColId} onValueChange={setReassignColId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione a coluna de destino..." /></SelectTrigger>
                <SelectContent>
                  {(columns[deleteCol.workspace_id] || [])
                    .filter((c) => c.id !== deleteCol.id)
                    .sort((a, b) => a.position - b.position)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteCol(null); setDeleteColLinkedCount(0); }}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteColumn}
              disabled={deletingCol || (deleteColLinkedCount > 0 && !reassignColId)}
              className="gap-1.5"
            >
              {deletingCol ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {deleteColLinkedCount > 0 ? "Mover cards e excluir" : "Excluir coluna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
