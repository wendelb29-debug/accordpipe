import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, GripVertical, Pencil, Check, X, Briefcase, BarChart3, Settings2, Loader2,
  ChevronDown, ChevronUp, Copy, Power, Layers, Clock, Hash, Sparkles,
  HeadphonesIcon, DollarSign, Users, Cog, LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const [editColSla, setEditColSla] = useState(7);
  const [editColSlaUnit, setEditColSlaUnit] = useState<"dias" | "horas">("dias");
  const [newlyAddedColId, setNewlyAddedColId] = useState<string | null>(null);

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
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Clear newly added highlight after 2s
  useEffect(() => {
    if (newlyAddedColId) {
      const t = setTimeout(() => setNewlyAddedColId(null), 2000);
      return () => clearTimeout(t);
    }
  }, [newlyAddedColId]);

  const toggleExpand = (id: string) => setExpandedWs((prev) => ({ ...prev, [id]: !prev[id] }));

  const openCreateDialog = () => {
    setEditingWs(null);
    setWsName("");
    setWsColor("#7C3AED");
    setWsType("vendas");
    setDialogOpen(true);
  };

  const openEditDialog = (ws: Workspace) => {
    setEditingWs(ws);
    setWsName(ws.name);
    setWsColor(ws.color);
    setWsType(ws.type);
    setDialogOpen(true);
  };

  const handleSaveWorkspace = async () => {
    if (!wsName.trim() || !companyId) return;
    setSaving(true);
    if (editingWs) {
      const { error } = await supabase
        .from("workspaces")
        .update({ name: wsName.trim(), color: wsColor, type: wsType } as any)
        .eq("id", editingWs.id);
      if (error) toast.error("Erro ao atualizar workspace");
      else toast.success("Workspace atualizado!");
    } else {
      const { data, error } = await supabase
        .from("workspaces")
        .insert({ name: wsName.trim(), servidor_id: companyId, color: wsColor, type: wsType, is_default: workspaces.length === 0 } as any)
        .select()
        .single();
      if (error) toast.error("Erro ao criar workspace");
      else {
        toast.success(`Workspace "${wsName.trim()}" criado!`);
        const defaultColsByType: Record<string, { name: string; position: number; sla_days: number; color: string }[]> = {
          vendas: [
            { name: "StandBy", position: 0, sla_days: 90, color: "#6B7280" },
            { name: "Novos Leads", position: 1, sla_days: 1, color: "#22C55E" },
            { name: "1º Contato", position: 2, sla_days: 5, color: "#3B82F6" },
            { name: "Call/Negócio", position: 3, sla_days: 3, color: "#F59E0B" },
            { name: "Follow-up 1", position: 4, sla_days: 15, color: "#A855F7" },
            { name: "Follow-up 2", position: 5, sla_days: 15, color: "#EC4899" },
            { name: "Proposta", position: 6, sla_days: 7, color: "#EF4444" },
          ],
          task: [
            { name: "A Fazer", position: 0, sla_days: 7, color: "#6B7280" },
            { name: "Em Progresso", position: 1, sla_days: 5, color: "#3B82F6" },
            { name: "Concluído", position: 2, sla_days: 0, color: "#22C55E" },
          ],
        };
        const cols = defaultColsByType[wsType];
        if (cols && data) {
          await supabase.from("kanban_columns").insert(
            cols.map((c) => ({ ...c, workspace_id: (data as any).id })) as any
          );
        }
        // Auto-expand new workspace
        if (data) setExpandedWs((p) => ({ ...p, [(data as any).id]: true }));
      }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteWs) return;
    const { error } = await supabase.from("workspaces").delete().eq("id", deleteWs.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Workspace excluído!"); fetchData(); }
    setDeleteWs(null);
  };

  const handleDuplicateWorkspace = async (ws: Workspace) => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name: `${ws.name} (cópia)`, servidor_id: companyId, color: ws.color, type: ws.type, is_default: false } as any)
      .select()
      .single();
    if (error) { toast.error("Erro ao duplicar"); return; }
    // Duplicate columns
    const wsCols = columns[ws.id] || [];
    if (wsCols.length > 0 && data) {
      await supabase.from("kanban_columns").insert(
        wsCols.map((c) => ({ workspace_id: (data as any).id, name: c.name, position: c.position, sla_days: c.sla_days, color: c.color })) as any
      );
    }
    toast.success("Workspace duplicado!");
    if (data) setExpandedWs((p) => ({ ...p, [(data as any).id]: true }));
    fetchData();
  };

  const handleSetDefault = async (ws: Workspace) => {
    if (!companyId) return;
    // Remove default from all
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
    else {
      if (data) setNewlyAddedColId((data as any).id);
      fetchData();
    }
  };

  const handleSaveColumn = async (col: KanbanColumn) => {
    if (!editColName.trim()) { toast.error("Nome da coluna é obrigatório"); return; }
    if (editColSla < 0) { toast.error("SLA não pode ser negativo"); return; }
    const slaDaysValue = editColSlaUnit === "horas" ? editColSla / 24 : editColSla;
    const { error } = await supabase
      .from("kanban_columns")
      .update({ name: editColName, sla_days: slaDaysValue } as any)
      .eq("id", col.id);
    if (error) toast.error("Erro ao atualizar coluna");
    else toast.success("Coluna atualizada");
    setEditingColId(null);
    fetchData();
  };

  const handleDeleteColumn = async (colId: string) => {
    const { error } = await supabase.from("kanban_columns").delete().eq("id", colId);
    if (error) toast.error("Erro ao excluir coluna"); else fetchData();
  };

  const handleMoveColumn = async (workspaceId: string, colId: string, direction: "up" | "down") => {
    const cols = [...(columns[workspaceId] || [])].sort((a, b) => a.position - b.position);
    const idx = cols.findIndex((c) => c.id === colId);
    if ((direction === "up" && idx <= 0) || (direction === "down" && idx >= cols.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    await Promise.all([
      supabase.from("kanban_columns").update({ position: cols[swapIdx].position } as any).eq("id", cols[idx].id),
      supabase.from("kanban_columns").update({ position: cols[idx].position } as any).eq("id", cols[swapIdx].id),
    ]);
    fetchData();
  };

  if (!companyId) {
    return <p className="text-sm text-muted-foreground text-center py-8">Salve o tenant primeiro para configurar workspaces.</p>;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Carregando workspaces...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Workspaces do Tenant
          </h3>
          <p className="text-xs text-muted-foreground">
            Gerencie departamentos, pipelines e funis Kanban do ambiente
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog} className="gap-1.5 bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 shadow-lg shadow-primary/20">
          <Plus className="h-3.5 w-3.5" /> Novo Workspace
        </Button>
      </div>

      {/* Empty state */}
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

            return (
              <div
                key={ws.id}
                className="border border-border/60 rounded-2xl bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Card header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(ws.id)}
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundColor: ws.color + "18", border: `1px solid ${ws.color}30` }}
                  >
                    <TypeIcon className="h-5 w-5" style={{ color: ws.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate">{ws.name}</p>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium border-border/50"
                        style={{ color: typeConf.color, borderColor: typeConf.color + "40" }}
                      >
                        {typeConf.label}
                      </Badge>
                      {ws.is_default && (
                        <Badge className="text-[10px] bg-primary/15 text-primary border-primary/20 hover:bg-primary/15">
                          Padrão
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" /> {wsCols.length} {wsCols.length === 1 ? "coluna" : "colunas"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {!ws.is_default && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Definir como padrão" onClick={() => handleSetDefault(ws)}>
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Duplicar" onClick={() => handleDuplicateWorkspace(ws)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Editar" onClick={() => openEditDialog(ws)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!ws.is_default && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Excluir" onClick={() => setDeleteWs(ws)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="text-muted-foreground ml-1">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border/40 px-5 py-4 bg-muted/10 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Colunas do Kanban
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {wsCols.length} {wsCols.length === 1 ? "etapa" : "etapas"}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {wsCols.map((col, idx) => {
                        const isEditing = editingColId === col.id;
                        const isNew = newlyAddedColId === col.id;

                        return (
                          <div
                            key={col.id}
                            className={cn(
                              "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition-all duration-300",
                              isEditing
                                ? "bg-primary/5 border border-primary/20 shadow-sm"
                                : "bg-card/60 border border-border/30 hover:border-border/60",
                              isNew && !isEditing && "ring-2 ring-primary/30 bg-primary/5"
                            )}
                          >
                            {/* Drag / reorder */}
                            <div className="flex flex-col gap-px">
                              <button
                                className="text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors"
                                disabled={idx === 0}
                                onClick={() => handleMoveColumn(ws.id, col.id, "up")}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                className="text-muted-foreground/50 hover:text-foreground disabled:opacity-20 transition-colors"
                                disabled={idx === wsCols.length - 1}
                                onClick={() => handleMoveColumn(ws.id, col.id, "down")}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Color dot */}
                            <div className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background" style={{ backgroundColor: col.color, boxShadow: `0 0 0 2px ${col.color}40` }} />

                            {isEditing ? (
                              <>
                                <Input
                                  value={editColName}
                                  onChange={(e) => setEditColName(e.target.value)}
                                  className="h-8 text-xs flex-1 bg-background/80"
                                  placeholder="Nome da etapa"
                                  autoFocus
                                  onKeyDown={(e) => e.key === "Enter" && handleSaveColumn(col)}
                                />
                                <div className="flex items-center gap-1.5">
                                  <div className="flex items-center gap-1 bg-background/80 rounded-lg border border-border/50 px-2 py-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <Input
                                      type="number"
                                      value={editColSla}
                                      onChange={(e) => setEditColSla(Number(e.target.value))}
                                      className="h-6 text-xs w-12 border-0 p-0 bg-transparent text-center"
                                      min={0}
                                    />
                                    <Select value={editColSlaUnit} onValueChange={(v) => setEditColSlaUnit(v as "dias" | "horas")}>
                                      <SelectTrigger className="h-6 w-[60px] text-[10px] border-0 bg-transparent p-0 pl-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="dias">dias</SelectItem>
                                        <SelectItem value="horas">horas</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-green-500/10" onClick={() => handleSaveColumn(col)}>
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10" onClick={() => setEditingColId(null)}>
                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-medium flex-1 truncate text-foreground">{col.name}</span>
                                <Badge variant="outline" className="text-[10px] shrink-0 font-mono border-border/40 text-muted-foreground">
                                  <Clock className="h-2.5 w-2.5 mr-1" />
                                  {col.sla_days < 1 && col.sla_days > 0
                                    ? `${Math.round(col.sla_days * 24)}h`
                                    : `${col.sla_days}d`}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-muted"
                                  style={{ opacity: 1 }}
                                  onClick={() => {
                                    setEditingColId(col.id);
                                    setEditColName(col.name);
                                    const isHours = col.sla_days < 1 && col.sla_days > 0;
                                    setEditColSlaUnit(isHours ? "horas" : "dias");
                                    setEditColSla(isHours ? Math.round(col.sla_days * 24) : col.sla_days);
                                  }}
                                >
                                  <Pencil className="h-3 w-3 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10" onClick={() => handleDeleteColumn(col.id)}>
                                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add column button */}
                    <button
                      onClick={() => handleAddColumn(ws.id)}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 text-xs font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar nova coluna
                    </button>
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
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layers className="h-4 w-4 text-primary" />
              </div>
              {editingWs ? "Editar Workspace" : "Novo Workspace"}
            </DialogTitle>
            <DialogDescription>
              {editingWs ? "Atualize as informações do workspace." : "Configure um novo departamento ou pipeline para o tenant."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Nome do Workspace</Label>
              <Input
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="Ex: Comercial, Marketing, Suporte..."
                autoFocus
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tipo</Label>
              <Select value={wsType} onValueChange={setWsType}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKSPACE_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" style={{ color: t.color }} />
                          {t.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {wsType === "vendas" ? "Inclui cálculo de P&S e MRR nos cards." : wsType === "task" ? "Apenas contagem de cards por coluna." : "Pipeline customizável para o departamento."}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Cor de Identificação</Label>
              <div className="flex gap-2 flex-wrap">
                {WORKSPACE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setWsColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-lg border-2 transition-all duration-150",
                      wsColor === c ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105 hover:border-border"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveWorkspace}
              disabled={!wsName.trim() || saving}
              className="gap-1.5 bg-gradient-to-r from-primary to-blue-600"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {saving ? "Salvando..." : editingWs ? "Salvar Alterações" : "Criar Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteWs} onOpenChange={(o) => !o && setDeleteWs(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir workspace "{deleteWs?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as colunas do kanban deste workspace serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkspace} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
