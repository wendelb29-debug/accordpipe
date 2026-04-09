import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, GripVertical, Pencil, Check, X, Briefcase, BarChart3, Settings2, Loader2,
  ChevronDown, ChevronUp, Copy, Power, Layers, Clock, Hash, Sparkles,
  HeadphonesIcon, DollarSign, Users, Cog, LayoutGrid, Save, Star, Flag, Palette,
  AlertTriangle, ArrowRight, FolderOpen, Folder, ArrowUp, ArrowDown,
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
import { WorkspaceGroupSection } from "./workspace/WorkspaceGroupSection";


export interface WorkspaceGroup {
  id: string;
  servidor_id: string;
  name: string;
  slug: string | null;
  type: string;
  icon: string;
  color: string;
  position: number;
  active: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  servidor_id: string;
  color: string;
  icon: string;
  type: string;
  is_default: boolean;
  group_id: string | null;
  sort_order: number;
}

export interface KanbanColumn {
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

export const WORKSPACE_COLORS = [
  "#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626",
  "#DB2777", "#4F46E5", "#0891B2", "#65A30D", "#F59E0B",
];

export const COLUMN_COLORS = [
  "#6B7280", "#22C55E", "#3B82F6", "#F59E0B", "#A855F7",
  "#EC4899", "#EF4444", "#14B8A6", "#8B5CF6", "#F97316",
];

export const WORKSPACE_TYPES = [
  { value: "vendas", label: "Vendas", icon: BarChart3, color: "#7C3AED" },
  { value: "crm", label: "CRM", icon: Users, color: "#2563EB" },
  { value: "suporte", label: "Suporte", icon: HeadphonesIcon, color: "#059669" },
  { value: "financeiro", label: "Financeiro", icon: DollarSign, color: "#D97706" },
  { value: "rh", label: "RH", icon: Users, color: "#DB2777" },
  { value: "operacional", label: "Operacional", icon: Cog, color: "#0891B2" },
  { value: "task", label: "Task", icon: LayoutGrid, color: "#65A30D" },
  { value: "custom", label: "Personalizado", icon: Sparkles, color: "#F59E0B" },
];

export function getTypeConfig(type: string) {
  return WORKSPACE_TYPES.find((t) => t.value === type) || WORKSPACE_TYPES[WORKSPACE_TYPES.length - 1];
}

export function WorkspacesTab({ companyId }: { companyId: string | null }) {
  const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [columns, setColumns] = useState<Record<string, KanbanColumn[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedWs, setExpandedWs] = useState<Record<string, boolean>>({});

  // Group drag reorder
  const [dragGroupId, setDragGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  // Move ungrouped dialog
  const [moveUngroupedOpen, setMoveUngroupedOpen] = useState(false);
  const [moveUngroupedTarget, setMoveUngroupedTarget] = useState("");

  // Group dialog
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WorkspaceGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState("vendas");
  const [groupColor, setGroupColor] = useState("#7C3AED");
  const [savingGroup, setSavingGroup] = useState(false);

  // Workspace dialog
  const [wsDialogOpen, setWsDialogOpen] = useState(false);
  const [editingWs, setEditingWs] = useState<Workspace | null>(null);
  const [wsName, setWsName] = useState("");
  const [wsColor, setWsColor] = useState("#7C3AED");
  const [wsType, setWsType] = useState("vendas");
  const [wsGroupId, setWsGroupId] = useState<string>("");
  const [savingWs, setSavingWs] = useState(false);

  // Delete group
  const [deleteGroup, setDeleteGroup] = useState<WorkspaceGroup | null>(null);
  const [deleteGroupAction, setDeleteGroupAction] = useState<"move" | "delete">("move");
  const [deleteGroupTarget, setDeleteGroupTarget] = useState("");

  // Delete workspace
  const [deleteWs, setDeleteWs] = useState<Workspace | null>(null);

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const [grpRes, wsRes] = await Promise.all([
      supabase.from("workspace_groups").select("*").eq("servidor_id", companyId).order("position"),
      supabase.from("workspaces").select("*").eq("servidor_id", companyId).order("sort_order").order("name"),
    ]);

    const grps = (grpRes.data || []) as WorkspaceGroup[];
    const wsList = (wsRes.data || []) as Workspace[];
    setGroups(grps);
    setWorkspaces(wsList);

    // Auto-expand all groups on first load
    if (Object.keys(expandedGroups).length === 0) {
      const exp: Record<string, boolean> = {};
      grps.forEach((g) => { exp[g.id] = true; });
      setExpandedGroups(exp);
    }

    if (wsList.length > 0) {
      const wsIds = wsList.map((w) => w.id);
      const { data: colData } = await supabase.from("kanban_columns").select("*").in("workspace_id", wsIds).order("position");
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

  // ─── Group CRUD ───
  const openGroupDialog = (grp?: WorkspaceGroup) => {
    setEditingGroup(grp || null);
    setGroupName(grp?.name || "");
    setGroupType(grp?.type || "vendas");
    setGroupColor(grp?.color || "#7C3AED");
    setGroupDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim() || !companyId) return;
    setSavingGroup(true);
    if (editingGroup) {
      const { error } = await supabase.from("workspace_groups")
        .update({ name: groupName.trim(), type: groupType, color: groupColor } as any)
        .eq("id", editingGroup.id);
      if (error) toast.error("Erro ao atualizar camada"); else toast.success("Camada atualizada!");
    } else {
      const { error } = await supabase.from("workspace_groups")
        .insert({ name: groupName.trim(), servidor_id: companyId, type: groupType, color: groupColor, position: groups.length, icon: getTypeConfig(groupType).icon.name || "folder" } as any);
      if (error) toast.error("Erro ao criar camada"); else toast.success("Camada criada!");
    }
    setSavingGroup(false);
    setGroupDialogOpen(false);
    fetchData();
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroup) return;
    const groupWs = workspaces.filter((w) => w.group_id === deleteGroup.id);

    if (groupWs.length > 0) {
      if (deleteGroupAction === "move") {
        if (!deleteGroupTarget) { toast.error("Selecione a camada de destino"); return; }
        const { error } = await supabase.from("workspaces")
          .update({ group_id: deleteGroupTarget } as any)
          .in("id", groupWs.map((w) => w.id));
        if (error) { toast.error("Erro ao mover workspaces"); return; }
      } else {
        // Delete all workspaces in group
        const wsIds = groupWs.map((w) => w.id);
        await supabase.from("kanban_columns").delete().in("workspace_id", wsIds);
        await supabase.from("workspaces").delete().in("id", wsIds);
      }
    }

    const { error } = await supabase.from("workspace_groups").delete().eq("id", deleteGroup.id);
    if (error) toast.error("Erro ao excluir camada"); else toast.success("Camada excluída!");
    setDeleteGroup(null);
    fetchData();
  };

  // ─── Workspace CRUD ───
  const openWsDialog = (ws?: Workspace, defaultGroupId?: string) => {
    setEditingWs(ws || null);
    setWsName(ws?.name || "");
    setWsColor(ws?.color || "#7C3AED");
    setWsType(ws?.type || "vendas");
    setWsGroupId(ws?.group_id || defaultGroupId || groups[0]?.id || "");
    setWsDialogOpen(true);
  };

  const handleSaveWorkspace = async () => {
    if (!wsName.trim() || !companyId) return;
    setSavingWs(true);
    if (editingWs) {
      const { error } = await supabase.from("workspaces")
        .update({ name: wsName.trim(), color: wsColor, type: wsType, group_id: wsGroupId || null } as any)
        .eq("id", editingWs.id);
      if (error) toast.error("Erro ao atualizar workspace"); else toast.success("Workspace atualizado!");
    } else {
      const groupWs = workspaces.filter((w) => w.group_id === wsGroupId);
      const { data, error } = await supabase.from("workspaces")
        .insert({ name: wsName.trim(), servidor_id: companyId, color: wsColor, type: wsType, group_id: wsGroupId || null, is_default: workspaces.length === 0, sort_order: groupWs.length } as any)
        .select().single();
      if (error) toast.error("Erro ao criar workspace");
      else {
        toast.success(`Workspace "${wsName.trim()}" criado!`);
        // Create default columns
        const defaultCols: Record<string, { name: string; position: number; sla_days: number; color: string; is_default?: boolean; is_final?: boolean }[]> = {
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
        const cols = defaultCols[wsType];
        if (cols && data) {
          await supabase.from("kanban_columns").insert(cols.map((c) => ({ ...c, workspace_id: (data as any).id })) as any);
        }
      }
    }
    setSavingWs(false);
    setWsDialogOpen(false);
    fetchData();
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteWs) return;
    await supabase.from("kanban_columns").delete().eq("workspace_id", deleteWs.id);
    const { error } = await supabase.from("workspaces").delete().eq("id", deleteWs.id);
    if (error) toast.error("Erro ao excluir"); else { toast.success("Workspace excluído!"); fetchData(); }
    setDeleteWs(null);
  };

  const handleDuplicateWorkspace = async (ws: Workspace) => {
    if (!companyId) return;
    const { data, error } = await supabase.from("workspaces")
      .insert({ name: `${ws.name} (cópia)`, servidor_id: companyId, color: ws.color, type: ws.type, is_default: false, group_id: ws.group_id } as any)
      .select().single();
    if (error) { toast.error("Erro ao duplicar"); return; }
    const wsCols = columns[ws.id] || [];
    if (wsCols.length > 0 && data) {
      await supabase.from("kanban_columns").insert(
        wsCols.map((c) => ({ workspace_id: (data as any).id, name: c.name, position: c.position, sla_days: c.sla_days, color: c.color, is_default: c.is_default, is_final: c.is_final, active: c.active })) as any
      );
    }
    toast.success("Workspace duplicado!");
    fetchData();
  };

  const handleSetDefault = async (ws: Workspace) => {
    if (!companyId) return;
    await supabase.from("workspaces").update({ is_default: false } as any).eq("servidor_id", companyId);
    await supabase.from("workspaces").update({ is_default: true } as any).eq("id", ws.id);
    toast.success(`"${ws.name}" definido como padrão`);
    fetchData();
  };

  // Filter
  const filteredGroups = groups.filter((g) => {
    if (filterGroup !== "all" && g.id !== filterGroup) return false;
    return true;
  });

  const getGroupWorkspaces = (groupId: string) => {
    return workspaces
      .filter((w) => w.group_id === groupId)
      .filter((w) => !search || w.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  };

  const ungroupedWorkspaces = workspaces
    .filter((w) => !w.group_id)
    .filter((w) => !search || w.name.toLowerCase().includes(search.toLowerCase()));

  // ─── Group reorder ───
  const handleGroupDragEnd = () => {
    if (dragGroupId && dragOverGroupId && dragGroupId !== dragOverGroupId) {
      const sorted = [...filteredGroups];
      const fromIdx = sorted.findIndex((g) => g.id === dragGroupId);
      const toIdx = sorted.findIndex((g) => g.id === dragOverGroupId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = sorted.splice(fromIdx, 1);
        sorted.splice(toIdx, 0, moved);
        const updated = sorted.map((g, i) => ({ ...g, position: i }));
        setGroups(updated);
        persistGroupOrder(updated);
      }
    }
    setDragGroupId(null);
    setDragOverGroupId(null);
  };

  const moveGroup = (groupId: string, direction: "up" | "down") => {
    const sorted = [...groups].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((g) => g.id === groupId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    [sorted[idx], sorted[targetIdx]] = [sorted[targetIdx], sorted[idx]];
    const updated = sorted.map((g, i) => ({ ...g, position: i }));
    setGroups(updated);
    persistGroupOrder(updated);
  };

  const persistGroupOrder = async (orderedGroups: WorkspaceGroup[]) => {
    try {
      await Promise.all(
        orderedGroups.map((g, i) =>
          supabase.from("workspace_groups").update({ position: i } as any).eq("id", g.id)
        )
      );
      toast.success("Ordem das camadas atualizada com sucesso.");
    } catch {
      toast.error("Erro ao salvar ordem das camadas");
      fetchData();
    }
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Workspaces
          </h3>
          <p className="text-xs text-muted-foreground">Gerencie os workspaces organizados por categorias</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => openGroupDialog()} className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" /> Nova Camada
          </Button>
          <Button size="sm" onClick={() => openWsDialog()} className="gap-1.5 bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 shadow-lg shadow-primary/20" disabled={groups.length === 0}>
            <Plus className="h-3.5 w-3.5" /> Novo Workspace
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      {(groups.length > 0 || workspaces.length > 0) && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input placeholder="Buscar workspace..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted/40 border-border/40 rounded-xl h-9 text-xs" />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-40 h-9 rounded-xl border-border/40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as camadas</SelectItem>
              {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-2xl bg-muted/20">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <FolderOpen className="h-7 w-7 text-primary/60" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Nenhuma camada criada ainda</p>
          <p className="text-xs text-muted-foreground mb-4">Crie sua primeira camada para começar a organizar seus workspaces.</p>
          <Button size="sm" onClick={() => openGroupDialog()} variant="outline" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Criar primeira camada
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredGroups.map((group, groupIdx) => {
            const groupWs = getGroupWorkspaces(group.id);
            const isExpanded = expandedGroups[group.id] ?? true;
            const typeConf = getTypeConfig(group.type);
            const TypeIcon = typeConf.icon;
            const isDraggingGroup = dragGroupId === group.id;
            const isDragOverGroup = dragOverGroupId === group.id && dragGroupId !== group.id;

            return (
              <div
                key={group.id}
                draggable
                onDragStart={(e) => { e.stopPropagation(); setDragGroupId(group.id); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (dragOverGroupId !== group.id) setDragOverGroupId(group.id); }}
                onDragEnd={handleGroupDragEnd}
                className={cn(
                  "rounded-2xl overflow-hidden transition-all duration-300",
                  isDraggingGroup && "opacity-40 scale-[0.98]",
                  isDragOverGroup && "ring-2 ring-primary/50 scale-[1.01]",
                )}
              >
                {/* Folder tab header */}
                <div
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 cursor-pointer select-none transition-all duration-200 rounded-t-2xl border border-b-0",
                    isExpanded
                      ? "bg-card border-border/60"
                      : "bg-card/60 border-border/40 rounded-b-2xl hover:bg-card/80 hover:border-border/60"
                  )}
                  onClick={() => setExpandedGroups((p) => ({ ...p, [group.id]: !p[group.id] }))}
                >
                  {/* Drag handle */}
                  <div
                    className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Folder icon */}
                  <div className="relative">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
                        isExpanded ? "shadow-lg" : "shadow-sm"
                      )}
                      style={{ backgroundColor: group.color + "20", boxShadow: isExpanded ? `0 4px 14px -3px ${group.color}30` : undefined }}
                    >
                      {isExpanded
                        ? <FolderOpen className="h-5 w-5 transition-transform duration-200" style={{ color: group.color }} />
                        : <Folder className="h-5 w-5 transition-transform duration-200" style={{ color: group.color }} />
                      }
                    </div>
                    {/* Badge count */}
                    <span
                      className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                      style={{ backgroundColor: group.color }}
                    >
                      {groupWs.length}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground">{group.name}</p>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border/40" style={{ color: typeConf.color, borderColor: typeConf.color + "40" }}>
                        <TypeIcon className="h-2.5 w-2.5 mr-0.5" />
                        {typeConf.label}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {groupWs.length} workspace{groupWs.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Mover para cima" disabled={groupIdx === 0} onClick={() => moveGroup(group.id, "up")}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Mover para baixo" disabled={groupIdx === filteredGroups.length - 1} onClick={() => moveGroup(group.id, "down")}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openGroupDialog(group)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { setDeleteGroup(group); setDeleteGroupAction("move"); setDeleteGroupTarget(""); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openWsDialog(undefined, group.id)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className={cn("text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")}>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>

                {/* Folder content area */}
                {isExpanded && (
                  <div
                    className="border border-t-0 border-border/60 rounded-b-2xl bg-muted/5 animate-in slide-in-from-top-2 duration-300"
                    style={{ borderLeft: `3px solid ${group.color}30` }}
                  >
                    {groupWs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                          <Folder className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Nenhum workspace nesta pasta</p>
                        <p className="text-[10px] text-muted-foreground/60 mb-3">Crie um workspace para começar</p>
                        <Button size="sm" variant="outline" className="gap-1.5 text-[11px] h-7 hover:border-primary/40 hover:text-primary" onClick={() => openWsDialog(undefined, group.id)}>
                          <Plus className="h-3 w-3" /> Novo workspace nesta pasta
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 space-y-2">
                        {groupWs.map((ws) => (
                          <WorkspaceGroupSection
                            key={ws.id}
                            ws={ws}
                            columns={columns}
                            setColumns={setColumns}
                            expandedWs={expandedWs}
                            setExpandedWs={setExpandedWs}
                            onEdit={(w) => openWsDialog(w)}
                            onDelete={(w) => setDeleteWs(w)}
                            onDuplicate={handleDuplicateWorkspace}
                            onSetDefault={handleSetDefault}
                            onRefresh={fetchData}
                          />
                        ))}
                        {/* Add workspace inside folder */}
                        <button
                          onClick={() => openWsDialog(undefined, group.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground/50 hover:text-primary transition-all text-[11px]"
                        >
                          <Plus className="h-3 w-3" /> Novo workspace nesta pasta
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Ungrouped workspaces - special folder */}
          {ungroupedWorkspaces.length > 0 && (
            <div className="rounded-2xl overflow-hidden">
              <div
                className={cn(
                  "flex items-center gap-3 px-5 py-3 cursor-pointer select-none transition-all duration-200 rounded-t-2xl border border-b-0",
                  (expandedGroups["__ungrouped"] ?? true)
                    ? "bg-card border-border/60"
                    : "bg-card/60 border-border/40 rounded-b-2xl hover:bg-card/80"
                )}
                onClick={() => setExpandedGroups((p) => ({ ...p, __ungrouped: !(p.__ungrouped ?? true) }))}
              >
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-muted/30">
                    {(expandedGroups["__ungrouped"] ?? true)
                      ? <FolderOpen className="h-5 w-5 text-muted-foreground" />
                      : <Folder className="h-5 w-5 text-muted-foreground" />
                    }
                  </div>
                  <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-muted-foreground/60 text-background">
                    {ungroupedWorkspaces.length}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground">Sem Camada</p>
                  <span className="text-[10px] text-muted-foreground/60">Workspaces ainda não organizados em uma pasta</span>
                </div>
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {groups.length > 0 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" title="Mover todos para uma camada" onClick={() => { setMoveUngroupedTarget(""); setMoveUngroupedOpen(true); }}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className={cn("text-muted-foreground transition-transform duration-200", (expandedGroups["__ungrouped"] ?? true) && "rotate-180")}>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
              {(expandedGroups["__ungrouped"] ?? true) && (
                <div className="border border-t-0 border-border/60 rounded-b-2xl bg-muted/5 p-3 space-y-2 animate-in slide-in-from-top-2 duration-300" style={{ borderLeft: "3px solid hsl(var(--muted-foreground) / 0.15)" }}>
                  {ungroupedWorkspaces.map((ws) => (
                    <WorkspaceGroupSection
                      key={ws.id}
                      ws={ws}
                      columns={columns}
                      setColumns={setColumns}
                      expandedWs={expandedWs}
                      setExpandedWs={setExpandedWs}
                      onEdit={(w) => openWsDialog(w)}
                      onDelete={(w) => setDeleteWs(w)}
                      onDuplicate={handleDuplicateWorkspace}
                      onSetDefault={handleSetDefault}
                      onRefresh={fetchData}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Group Dialog ─── */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><FolderOpen className="h-4 w-4 text-primary" /></div>
              {editingGroup ? "Editar Camada" : "Nova Camada"}
            </DialogTitle>
            <DialogDescription>{editingGroup ? "Atualize as informações da camada." : "Crie uma nova categoria para agrupar seus workspaces."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Nome da Camada</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ex: Vendas, Suporte, Financeiro..." autoFocus className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tipo</Label>
              <Select value={groupType} onValueChange={setGroupType}>
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
              <Label className="text-xs font-medium">Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {WORKSPACE_COLORS.map((c) => (
                  <button key={c} onClick={() => setGroupColor(c)} className={cn("h-8 w-8 rounded-lg border-2 transition-all duration-150", groupColor === c ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105 hover:border-border")} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveGroup} disabled={!groupName.trim() || savingGroup} className="gap-1.5 bg-gradient-to-r from-primary to-blue-600">
              {savingGroup && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingGroup ? "Salvar" : "Criar Camada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Workspace Dialog ─── */}
      <Dialog open={wsDialogOpen} onOpenChange={setWsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Layers className="h-4 w-4 text-primary" /></div>
              {editingWs ? "Editar Workspace" : "Novo Workspace"}
            </DialogTitle>
            <DialogDescription>{editingWs ? "Atualize as informações do workspace." : "Configure um novo workspace dentro de uma camada."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Camada *</Label>
              <Select value={wsGroupId} onValueChange={setWsGroupId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione a camada..." /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => {
                    const tc = getTypeConfig(g.type);
                    const GIcon = tc.icon;
                    return <SelectItem key={g.id} value={g.id}><span className="flex items-center gap-2"><GIcon className="h-3.5 w-3.5" style={{ color: g.color }} />{g.name}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Nome do Workspace</Label>
              <Input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="Ex: Comercial, Pré-vendas..." className="h-10" />
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
              <Label className="text-xs font-medium">Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {WORKSPACE_COLORS.map((c) => (
                  <button key={c} onClick={() => setWsColor(c)} className={cn("h-8 w-8 rounded-lg border-2 transition-all duration-150", wsColor === c ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105 hover:border-border")} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveWorkspace} disabled={!wsName.trim() || !wsGroupId || savingWs} className="gap-1.5 bg-gradient-to-r from-primary to-blue-600">
              {savingWs && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingWs ? "Salvar" : "Criar Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Group Dialog ─── */}
      <Dialog open={!!deleteGroup} onOpenChange={(o) => { if (!o) setDeleteGroup(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Excluir camada "{deleteGroup?.name}"
            </DialogTitle>
            <DialogDescription>
              {workspaces.filter((w) => w.group_id === deleteGroup?.id).length > 0
                ? "Esta camada possui workspaces vinculados. Escolha uma ação:"
                : "Esta camada será removida permanentemente."
              }
            </DialogDescription>
          </DialogHeader>
          {deleteGroup && workspaces.filter((w) => w.group_id === deleteGroup.id).length > 0 && (
            <div className="space-y-3 py-2">
              <div className="flex gap-2">
                <Button size="sm" variant={deleteGroupAction === "move" ? "default" : "outline"} className="flex-1 text-xs h-8" onClick={() => setDeleteGroupAction("move")}>
                  Mover workspaces
                </Button>
                <Button size="sm" variant={deleteGroupAction === "delete" ? "destructive" : "outline"} className="flex-1 text-xs h-8" onClick={() => setDeleteGroupAction("delete")}>
                  Excluir tudo
                </Button>
              </div>
              {deleteGroupAction === "move" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Mover para:</Label>
                  <Select value={deleteGroupTarget} onValueChange={setDeleteGroupTarget}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {groups.filter((g) => g.id !== deleteGroup.id).map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteGroup(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={deleteGroupAction === "move" && !deleteGroupTarget && workspaces.filter((w) => w.group_id === deleteGroup?.id).length > 0}>
              {deleteGroupAction === "delete" ? "Excluir tudo" : "Mover e excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Workspace ─── */}
      <AlertDialog open={!!deleteWs} onOpenChange={(o) => !o && setDeleteWs(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir workspace "{deleteWs?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Todas as colunas do kanban deste workspace serão removidas. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkspace} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
