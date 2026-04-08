import { useState } from "react";
import {
  Briefcase, Plus, ChevronDown, Settings, Trash2, Palette, Check,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

const WORKSPACE_COLORS = [
  "#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626",
  "#DB2777", "#7C3AED", "#4F46E5", "#0891B2", "#65A30D",
];

export function WorkspaceSelector() {
  const {
    workspaces, activeWorkspace, selectWorkspace,
    createWorkspace, updateWorkspace, deleteWorkspace, isAdminOrCeo,
  } = useWorkspaceContext();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#7C3AED");

  const handleCreate = () => {
    setEditingId(null);
    setName("");
    setColor("#7C3AED");
    setDialogOpen(true);
  };

  const handleEdit = (ws: typeof activeWorkspace) => {
    if (!ws) return;
    setEditingId(ws.id);
    setName(ws.name);
    setColor(ws.color);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editingId) {
      await updateWorkspace(editingId, { name: name.trim(), color });
    } else {
      const ws = await createWorkspace(name.trim(), color);
      if (ws) selectWorkspace(ws.id);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este workspace?")) {
      await deleteWorkspace(id);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8 text-xs font-semibold border-primary/20 hover:border-primary/40 transition-colors max-w-[200px]"
          >
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: activeWorkspace?.color || "#7C3AED" }}
            />
            <span className="truncate">
              {activeWorkspace?.name || "Workspace"}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Workspaces
          </p>
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => selectWorkspace(ws.id)}
              className="gap-2 group"
            >
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: ws.color }}
              />
              <span className="flex-1 truncate text-sm">{ws.name}</span>
              {ws.id === activeWorkspace?.id && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
              {isAdminOrCeo && (
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(ws); }}
                    className="p-0.5 hover:text-primary"
                  >
                    <Settings className="h-3 w-3" />
                  </button>
                  {!ws.is_default && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }}
                      className="p-0.5 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </DropdownMenuItem>
          ))}
          {isAdminOrCeo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCreate} className="gap-2 text-primary">
                <Plus className="h-3.5 w-3.5" />
                <span className="text-sm">Novo Workspace</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Workspace" : "Novo Workspace"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Comercial, Parcerias..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" /> Cor
              </Label>
              <div className="flex gap-2 flex-wrap">
                {WORKSPACE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all",
                      color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
