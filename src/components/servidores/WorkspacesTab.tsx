import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, GripVertical, Pencil, Check, X, Briefcase, ListChecks, BarChart3, Settings2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  // Column editing
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColName, setEditColName] = useState("");
  const [editColSla, setEditColSla] = useState(7);

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
        // Create default columns for vendas type
        if (wsType === "vendas" && data) {
          const defaultCols = [
            { name: "StandBy", position: 0, sla_days: 90, color: "#6B7280" },
            { name: "Novos Leads", position: 1, sla_days: 1, color: "#22C55E" },
            { name: "1º Contato", position: 2, sla_days: 5, color: "#3B82F6" },
            { name: "Call/Negócio", position: 3, sla_days: 3, color: "#F59E0B" },
            { name: "Follow-up 1", position: 4, sla_days: 15, color: "#A855F7" },
            { name: "Follow-up 2", position: 5, sla_days: 15, color: "#EC4899" },
            { name: "Proposta", position: 6, sla_days: 7, color: "#EF4444" },
          ];
          await supabase.from("kanban_columns").insert(
            defaultCols.map((c) => ({ ...c, workspace_id: (data as any).id })) as any
          );
        } else if (wsType === "task" && data) {
          const defaultCols = [
            { name: "A Fazer", position: 0, sla_days: 7, color: "#6B7280" },
            { name: "Em Progresso", position: 1, sla_days: 5, color: "#3B82F6" },
            { name: "Concluído", position: 2, sla_days: 0, color: "#22C55E" },
          ];
          await supabase.from("kanban_columns").insert(
            defaultCols.map((c) => ({ ...c, workspace_id: (data as any).id })) as any
          );
        }
      }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDeleteWorkspace = async (ws: Workspace) => {
    if (ws.is_default) { toast.error("Não é possível excluir o workspace padrão"); return; }
    if (!confirm(`Excluir workspace "${ws.name}"?`)) return;
    const { error } = await supabase.from("workspaces").delete().eq("id", ws.id);
    if (error) toast.error("Erro ao excluir"); else { toast.success("Workspace excluído!"); fetchData(); }
  };

  // Column CRUD
  const handleAddColumn = async (workspaceId: string) => {
    const currentCols = columns[workspaceId] || [];
    const { error } = await supabase.from("kanban_columns").insert({
      workspace_id: workspaceId,
      name: "Nova Etapa",
      position: currentCols.length,
      sla_days: 7,
      color: COLUMN_COLORS[currentCols.length % COLUMN_COLORS.length],
    } as any);
    if (error) toast.error("Erro ao criar coluna"); else fetchData();
  };

  const handleSaveColumn = async (col: KanbanColumn) => {
    const { error } = await supabase
      .from("kanban_columns")
      .update({ name: editColName, sla_days: editColSla } as any)
      .eq("id", col.id);
    if (error) toast.error("Erro ao atualizar coluna");
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
    const updates = [
      supabase.from("kanban_columns").update({ position: cols[swapIdx].position } as any).eq("id", cols[idx].id),
      supabase.from("kanban_columns").update({ position: cols[idx].position } as any).eq("id", cols[swapIdx].id),
    ];
    await Promise.all(updates);
    fetchData();
  };

  if (!companyId) {
    return <p className="text-sm text-muted-foreground text-center py-8">Salve o tenant primeiro para configurar workspaces.</p>;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Workspaces do Tenant</h3>
          <p className="text-xs text-muted-foreground">Gerencie os departamentos e seus funis Kanban.</p>
        </div>
        <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Novo Workspace
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum workspace criado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {workspaces.map((ws) => (
            <div key={ws.id} className="border border-border rounded-xl bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: ws.color + "20" }}>
                  <BarChart3 className="h-4 w-4" style={{ color: ws.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{ws.name}</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5">
                    {ws.type === "vendas" ? "Vendas" : "Task"}
                  </Badge>
                </div>
                {ws.is_default && (
                  <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(ws)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {!ws.is_default && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteWorkspace(ws)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Kanban Columns */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="cols" className="border-none">
                  <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Settings2 className="h-3.5 w-3.5" />
                      Colunas do Kanban ({(columns[ws.id] || []).length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="space-y-1.5">
                      {(columns[ws.id] || []).sort((a, b) => a.position - b.position).map((col, idx) => (
                        <div key={col.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            <button
                              className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                              disabled={idx === 0}
                              onClick={() => handleMoveColumn(ws.id, col.id, "up")}
                            >
                              <GripVertical className="h-3 w-3 rotate-180" />
                            </button>
                            <button
                              className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                              disabled={idx === (columns[ws.id] || []).length - 1}
                              onClick={() => handleMoveColumn(ws.id, col.id, "down")}
                            >
                              <GripVertical className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />

                          {editingColId === col.id ? (
                            <>
                              <Input
                                value={editColName}
                                onChange={(e) => setEditColName(e.target.value)}
                                className="h-7 text-xs flex-1"
                                autoFocus
                              />
                              <Input
                                type="number"
                                value={editColSla}
                                onChange={(e) => setEditColSla(Number(e.target.value))}
                                className="h-7 text-xs w-16"
                                min={0}
                              />
                              <span className="text-[10px] text-muted-foreground">dias</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSaveColumn(col)}>
                                <Check className="h-3 w-3 text-green-500" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingColId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-medium flex-1 truncate">{col.name}</span>
                              <Badge variant="outline" className="text-[10px] shrink-0">{col.sla_days}d</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  setEditingColId(col.id);
                                  setEditColName(col.name);
                                  setEditColSla(col.sla_days);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteColumn(col.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full mt-2 gap-1.5 text-xs" onClick={() => handleAddColumn(ws.id)}>
                        <Plus className="h-3 w-3" /> Adicionar Coluna
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Workspace Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWs ? "Editar Workspace" : "Novo Workspace"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="Ex: Comercial, Marketing..." autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={wsType} onValueChange={setWsType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">
                    <span className="flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /> Vendas</span>
                  </SelectItem>
                  <SelectItem value="task">
                    <span className="flex items-center gap-2"><ListChecks className="h-3.5 w-3.5" /> Task</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {wsType === "vendas" ? "Inclui cálculo de P&S e MRR nos cards." : "Apenas contagem de cards por coluna."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {WORKSPACE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setWsColor(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${wsColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveWorkspace} disabled={!wsName.trim() || saving}>
              {saving ? "Salvando..." : editingWs ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
