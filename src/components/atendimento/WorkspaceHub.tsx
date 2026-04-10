import { useState, useEffect, useCallback } from "react";
import accordPatternDark from "@/assets/accord-pattern-dark.png";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, ClipboardList, Plus, Settings, Trash2,
  Search, ChevronLeft, BarChart3, HeadphonesIcon,
  DollarSign, Users, Cog, LayoutGrid, Sparkles, FolderOpen,
  Megaphone, UserCheck, Calculator, CreditCard, Receipt, Monitor, Rocket, Phone, Briefcase,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const TYPE_ICONS: Record<string, any> = {
  vendas: TrendingUp,
  crm: Users,
  onboarding: Rocket,
  pre_venda_sdr: Phone,
  comercial: Briefcase,
  pos_venda: UserCheck,
  marketing: Megaphone,
  administrativo: Settings,
  financeiro: DollarSign,
  departamento_pessoal: Users,
  rh: Users,
  contas_pagar: CreditCard,
  contas_receber: Receipt,
  cobranca: Calculator,
  analista: Search,
  ti: Monitor,
  suporte: HeadphonesIcon,
  operacional: Cog,
  task: LayoutGrid,
  tarefas: ClipboardList,
  custom: Sparkles,
};

const TYPE_LABELS: Record<string, string> = {
  vendas: "Vendas",
  crm: "CRM",
  onboarding: "Onboarding",
  pre_venda_sdr: "Pré-venda (SDR)",
  comercial: "Comercial",
  pos_venda: "Pós-venda",
  marketing: "Marketing",
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  departamento_pessoal: "Departamento Pessoal",
  rh: "RH",
  contas_pagar: "Contas a Pagar",
  contas_receber: "Contas a Receber",
  cobranca: "Cobrança",
  analista: "Analista",
  ti: "TI",
  suporte: "Suporte",
  operacional: "Operacional",
  task: "Task",
  tarefas: "Tarefas",
  custom: "Personalizado",
};

interface WorkspaceGroup {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  position: number;
}

interface WorkspaceHubProps {
  onSelectWorkspace: (id: string) => void;
}

export function WorkspaceHub({ onSelectWorkspace }: WorkspaceHubProps) {
  const { workspaces, isAdminOrCeo } = useWorkspaceContext();
  const navigate = useNavigate();
  const companyId = useActiveCompanyId();

  const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("workspace_groups")
      .select("*")
      .eq("servidor_id", companyId)
      .eq("active", true)
      .order("position");
    setGroups((data || []) as WorkspaceGroup[]);
  }, [companyId]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const filtered = workspaces.filter((ws) => {
    if (search && !ws.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGroup !== "all" && (ws as any).group_id !== filterGroup) return false;
    return true;
  });

  // Group workspaces by group_id
  const groupedByGroup: Record<string, typeof workspaces> = {};
  const ungrouped: typeof workspaces = [];

  filtered.forEach((ws) => {
    const gid = (ws as any).group_id;
    if (gid) {
      if (!groupedByGroup[gid]) groupedByGroup[gid] = [];
      groupedByGroup[gid].push(ws);
    } else {
      ungrouped.push(ws);
    }
  });

  // Order groups by position, filter by selected group
  const orderedGroups = groups.filter((g) => {
    if (filterGroup !== "all" && g.id !== filterGroup) return false;
    return (groupedByGroup[g.id]?.length ?? 0) > 0;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border/50">
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
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-36 h-10 rounded-xl border-border/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Workspace Cards grouped by workspace_groups */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        {orderedGroups.map((group) => {
          const wsList = groupedByGroup[group.id] || [];
          if (wsList.length === 0) return null;
          const Icon = TYPE_ICONS[group.type] || TrendingUp;
          return (
            <div key={group.id} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4" style={{ color: group.color }} />
                <h2 className="text-sm font-bold text-foreground">{group.name}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {wsList.map((ws) => (
                  <WorkspaceCard
                    key={ws.id}
                    workspace={ws}
                    onClick={() => onSelectWorkspace(ws.id)}
                    onEdit={isAdminOrCeo ? () => {} : undefined}
                    onDelete={isAdminOrCeo && !ws.is_default ? () => {} : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Ungrouped */}
        {filterGroup === "all" && ungrouped.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-bold text-foreground">Sem Camada</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ungrouped.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  workspace={ws}
                  onClick={() => onSelectWorkspace(ws.id)}
                  onEdit={isAdminOrCeo ? () => {} : undefined}
                  onDelete={isAdminOrCeo && !ws.is_default ? () => {} : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum workspace encontrado</p>
          </div>
        )}
      </div>
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
  const wsType = workspace.type || "vendas";
  const Icon = TYPE_ICONS[wsType] || TrendingUp;

  return (
    <button
      onClick={onClick}
      className="group relative w-full rounded-xl border border-border/50 bg-card hover:bg-card/80 hover:border-primary/30 transition-all duration-200 text-left overflow-hidden"
    >
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
            {TYPE_LABELS[wsType] || wsType}
          </span>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button onClick={onEdit} className="h-6 w-6 flex items-center justify-center rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </button>
  );
}
