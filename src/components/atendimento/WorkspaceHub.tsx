import { useState } from "react";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useCrmLeads } from "@/hooks/useCrmLeads";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp,
  ClipboardList,
  Plus,
  Settings,
  Trash2,
  Palette,
  Search,
  ChevronLeft,
  BarChart3,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const WORKSPACE_COLORS = [
  "#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626",
  "#DB2777", "#4F46E5", "#0891B2", "#65A30D", "#F59E0B",
];

const TYPE_ICONS: Record<string, typeof TrendingUp> = {
  vendas: TrendingUp,
  tarefas: ClipboardList,
};

const TYPE_LABELS: Record<string, string> = {
  vendas: "Vendas",
  tarefas: "Tarefas",
};

interface WorkspaceHubProps {
  onSelectWorkspace: (id: string) => void;
}

export function WorkspaceHub({ onSelectWorkspace }: WorkspaceHubProps) {
  const {
    workspaces, createWorkspace, updateWorkspace, deleteWorkspace, isAdminOrCeo,
  } = useWorkspaceContext();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#7C3AED");
  const [type, setType] = useState("vendas");

  const filtered = workspaces.filter((ws) => {
    if (search && !ws.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && (ws as any).type !== filterType) return false;
    return true;
  });

  // Group by type
  const grouped = filtered.reduce((acc, ws) => {
    const t = (ws as any).type || "vendas";
    if (!acc[t]) acc[t] = [];
    acc[t].push(ws);
    return acc;
  }, {} as Record<string, typeof workspaces>);

  const handleCreate = () => {
    setEditingId(null);
    setName("");
    setColor("#7C3AED");
    setType("vendas");
    setDialogOpen(true);
  };

  const handleEdit = (ws: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(ws.id);
    setName(ws.name);
    setColor(ws.color);
    setType(ws.type || "vendas");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editingId) {
      await updateWorkspace(editingId, { name: name.trim(), color } as any);
    } else {
      const ws = await createWorkspace(name.trim(), color);
      if (ws) {
        // Type is set via default in DB
      }
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este workspace?")) {
      await deleteWorkspace(id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border/50">
        <button
          onClick={() => navigate("/home")}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Workspaces</h1>
          <p className="text-xs text-muted-foreground">Selecione um kanban para gerenciar</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Buscar kanban..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/40 border-border/40 rounded-xl h-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32 h-10 rounded-xl border-border/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="vendas">Vendas</SelectItem>
            <SelectItem value="tarefas">Tarefas</SelectItem>
          </SelectContent>
        </Select>
        {isAdminOrCeo && (
          <Button onClick={handleCreate} size="icon" className="h-10 w-10 rounded-xl shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Workspace Cards */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        {Object.entries(grouped).map(([typeKey, wsList]) => {
          const Icon = TYPE_ICONS[typeKey] || TrendingUp;
          return (
            <div key={typeKey} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">{TYPE_LABELS[typeKey] || typeKey}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {wsList.map((ws) => (
                  <WorkspaceCard
                    key={ws.id}
                    workspace={ws}
                    onClick={() => onSelectWorkspace(ws.id)}
                    onEdit={isAdminOrCeo ? (e) => handleEdit(ws, e) : undefined}
                    onDelete={isAdminOrCeo && !ws.is_default ? (e) => handleDelete(ws.id, e) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum workspace encontrado</p>
            {isAdminOrCeo && (
              <Button variant="outline" size="sm" className="mt-3" onClick={handleCreate}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Criar Workspace
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>{editingId ? "Editar Workspace" : "Nova Solicitação"}</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {editingId ? "Edite as informações do workspace" : "Abra uma nova solicitação em qualquer workspace do seu tenant"}
            </p>
          </SheetHeader>
          <div className="flex-1 space-y-6 py-6">
            <div className="space-y-2">
              <Label>Workspace *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione um workspace..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="tarefas">Tarefas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Comercial, Parcerias..."
                className="h-11"
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border/50">
            <Button variant="outline" className="flex-1 h-11" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 h-11" onClick={handleSave} disabled={!name.trim()}>
              {editingId ? "Salvar" : "Criar Solicitação"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function WorkspaceCard({
  workspace,
  onClick,
  onEdit,
  onDelete,
}: {
  workspace: any;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  const Icon = TYPE_ICONS[(workspace as any).type || "vendas"] || TrendingUp;

  return (
    <button
      onClick={onClick}
      className="group relative w-full rounded-xl border border-border/50 bg-card hover:bg-card/80 hover:border-primary/30 transition-all duration-200 text-left overflow-hidden"
    >
      {/* Color banner */}
      <div
        className="h-20 w-full flex items-center justify-center"
        style={{ backgroundColor: workspace.color + "30" }}
      >
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-1 h-8 rounded-full" style={{ backgroundColor: workspace.color + "60" }} />
          ))}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-bold text-foreground truncate">{workspace.name}</h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: workspace.color + "20", color: workspace.color }}
          >
            <Icon className="h-3 w-3" />
            {TYPE_LABELS[(workspace as any).type || "vendas"]}
          </span>
        </div>
      </div>

      {/* Admin actions */}
      {(onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              className="h-6 w-6 flex items-center justify-center rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="h-6 w-6 flex items-center justify-center rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </button>
  );
}
