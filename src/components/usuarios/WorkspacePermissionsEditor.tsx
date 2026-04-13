import { useState, useEffect, useMemo } from "react";
import {
  Search, Eye, Settings2, Trash2, CheckSquare, XSquare, Building2,
  ChevronDown, ChevronRight, Sparkles, Filter, Shield
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId: string;
  userRole?: string;
  isCeoOrMaster?: boolean;
  onClose?: () => void;
}

interface WorkspaceGroup {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  position: number;
}

interface WorkspaceItem {
  id: string;
  name: string;
  color: string;
  type?: string;
  group_id?: string | null;
}

interface LocalPerm {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const ROLE_WORKSPACE_SUGGESTIONS: Record<string, string[]> = {
  comercial: ["comercial", "vendas", "sales", "sdr"],
  financeiro: ["financeiro", "cobrança", "billing", "finance"],
  administrativo: ["administrativo", "admin", "backoffice", "rh"],
  operador: ["onboarding", "operacional", "suporte"],
};

export function WorkspacePermissionsEditor({ userId, userRole, isCeoOrMaster, onClose }: Props) {
  const companyId = useActiveCompanyId();
  const { permissions, loading: permsLoading, savePermissions } = useUserWorkspacePermissions(userId, companyId);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [localPerms, setLocalPerms] = useState<Record<string, LocalPerm>>({});
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const [wsRes, grpRes] = await Promise.all([
        supabase.from("workspaces").select("id, name, color, type, group_id").eq("servidor_id", companyId).order("name"),
        supabase.from("workspace_groups").select("*").eq("servidor_id", companyId).order("position"),
      ]);
      setWorkspaces((wsRes.data || []) as WorkspaceItem[]);
      setGroups((grpRes.data || []) as WorkspaceGroup[]);
      // Start with all groups expanded
      const allIds = new Set((grpRes.data || []).map((g: any) => g.id));
      allIds.add("__ungrouped__");
      setExpandedGroups(allIds);
      setLoading(false);
    })();
  }, [companyId]);

  useEffect(() => {
    const perms: Record<string, LocalPerm> = {};
    workspaces.forEach((ws) => {
      const existing = permissions.find((p) => p.workspace_id === ws.id);
      perms[ws.id] = {
        can_view: existing?.can_view ?? false,
        can_edit: existing?.can_edit ?? false,
        can_delete: existing?.can_delete ?? false,
      };
    });
    setLocalPerms(perms);
  }, [workspaces, permissions]);

  // Group workspaces by their group
  const groupedWorkspaces = useMemo(() => {
    const grouped: Record<string, WorkspaceItem[]> = {};
    const filtered = workspaces.filter((ws) => {
      const matchesSearch = ws.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGroup = filterGroup === "all" || ws.group_id === filterGroup || (filterGroup === "__ungrouped__" && !ws.group_id);
      return matchesSearch && matchesGroup;
    });

    filtered.forEach((ws) => {
      const key = ws.group_id || "__ungrouped__";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ws);
    });
    return grouped;
  }, [workspaces, searchTerm, filterGroup]);

  // Stats
  const stats = useMemo(() => {
    const values = Object.values(localPerms);
    return {
      viewCount: values.filter((p) => p.can_view).length,
      editCount: values.filter((p) => p.can_edit).length,
      deleteCount: values.filter((p) => p.can_delete).length,
      total: workspaces.length,
    };
  }, [localPerms, workspaces]);

  if (isCeoOrMaster) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <Shield className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium text-foreground">Acesso Total</p>
          <p className="text-sm text-muted-foreground">
            Usuários CEO/Master possuem acesso a todos os workspaces automaticamente.
          </p>
        </div>
      </div>
    );
  }

  if (loading || permsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const togglePerm = (wsId: string, field: keyof LocalPerm) => {
    setLocalPerms((prev) => {
      const current = prev[wsId] || { can_view: false, can_edit: false, can_delete: false };
      const updated = { ...current, [field]: !current[field] };
      if ((field === "can_edit" || field === "can_delete") && updated[field]) {
        updated.can_view = true;
      }
      if (field === "can_delete" && updated.can_delete) {
        updated.can_edit = true;
      }
      if (field === "can_view" && !updated.can_view) {
        updated.can_edit = false;
        updated.can_delete = false;
      }
      if (field === "can_edit" && !updated.can_edit) {
        updated.can_delete = false;
      }
      return { ...prev, [wsId]: updated };
    });
  };

  const bulkAction = (action: "selectAll" | "clearAll" | "viewAll" | "editAllVisible" | "removeDeleteAll") => {
    setLocalPerms((prev) => {
      const next = { ...prev };
      workspaces.forEach((ws) => {
        const cur = next[ws.id] || { can_view: false, can_edit: false, can_delete: false };
        switch (action) {
          case "selectAll":
            next[ws.id] = { can_view: true, can_edit: true, can_delete: true };
            break;
          case "clearAll":
            next[ws.id] = { can_view: false, can_edit: false, can_delete: false };
            break;
          case "viewAll":
            next[ws.id] = { ...cur, can_view: true };
            break;
          case "editAllVisible":
            if (cur.can_view) next[ws.id] = { ...cur, can_edit: true };
            break;
          case "removeDeleteAll":
            next[ws.id] = { ...cur, can_delete: false };
            break;
        }
      });
      return next;
    });
  };

  const suggestByProfile = () => {
    if (!userRole) {
      toast.info("Nenhum perfil definido para sugestão.");
      return;
    }
    const keywords = ROLE_WORKSPACE_SUGGESTIONS[userRole.toLowerCase()] || [];
    if (keywords.length === 0) {
      toast.info(`Sem sugestões automáticas para o perfil "${userRole}".`);
      return;
    }
    setLocalPerms((prev) => {
      const next = { ...prev };
      workspaces.forEach((ws) => {
        const nameL = ws.name.toLowerCase();
        const typeL = (ws.type || "").toLowerCase();
        const groupName = groups.find((g) => g.id === ws.group_id)?.name?.toLowerCase() || "";
        const matches = keywords.some(
          (kw) => nameL.includes(kw) || typeL.includes(kw) || groupName.includes(kw)
        );
        if (matches) {
          next[ws.id] = { can_view: true, can_edit: true, can_delete: false };
        }
      });
      return next;
    });
    toast.success("Sugestões aplicadas pelo perfil!");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const permsToSave = Object.entries(localPerms).map(([workspace_id, perm]) => ({
        workspace_id,
        ...perm,
      }));
      await savePermissions(permsToSave);
      toast.success("Permissões de workspace salvas!");
      onClose?.();
    } catch {
      toast.error("Erro ao salvar permissões de workspace.");
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const getGroupName = (groupId: string) => {
    if (groupId === "__ungrouped__") return "Sem Departamento";
    return groups.find((g) => g.id === groupId)?.name || "Grupo";
  };

  const orderedGroupIds = useMemo(() => {
    const groupIds = groups
      .filter((g) => groupedWorkspaces[g.id]?.length)
      .map((g) => g.id);
    if (groupedWorkspaces["__ungrouped__"]?.length) groupIds.push("__ungrouped__");
    return groupIds;
  }, [groups, groupedWorkspaces]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with stats */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Controle de Acesso</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs gap-1">
              <Eye className="h-3 w-3" /> {stats.viewCount}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Settings2 className="h-3 w-3" /> {stats.editCount}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Trash2 className="h-3 w-3" /> {stats.deleteCount}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {stats.viewCount}/{stats.total}
            </Badge>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar workspace..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          {groups.length > 0 && (
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos Departamentos</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id} className="text-xs">{g.name}</SelectItem>
                ))}
                <SelectItem value="__ungrouped__" className="text-xs">Sem Departamento</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={() => bulkAction("selectAll")} className="text-xs gap-1 h-7">
            <CheckSquare className="h-3 w-3" /> Todos
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkAction("clearAll")} className="text-xs gap-1 h-7">
            <XSquare className="h-3 w-3" /> Limpar
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkAction("viewAll")} className="text-xs gap-1 h-7">
            <Eye className="h-3 w-3" /> Visualizar todos
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkAction("editAllVisible")} className="text-xs gap-1 h-7">
            <Settings2 className="h-3 w-3" /> Operar visíveis
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkAction("removeDeleteAll")} className="text-xs gap-1 h-7">
            <Trash2 className="h-3 w-3" /> Remover exclusão
          </Button>
          {userRole && (
            <Button variant="secondary" size="sm" onClick={suggestByProfile} className="text-xs gap-1 h-7">
              <Sparkles className="h-3 w-3" /> Sugerir pelo perfil
            </Button>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-muted-foreground px-1 border-b border-border pb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1 cursor-help"><Eye className="h-3.5 w-3.5" /> Visualizar</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[200px]">
              Permite ver o workspace e seus dados
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1 cursor-help"><Settings2 className="h-3.5 w-3.5" /> Operar</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[200px]">
              Mover cards, editar dados, criar registros e interagir no workspace
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1 cursor-help"><Trash2 className="h-3.5 w-3.5" /> Excluir</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[200px]">
              Permite excluir itens dentro do workspace
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Grouped Workspace List */}
        <div className="space-y-1 max-h-[42vh] overflow-y-auto pr-1">
          {orderedGroupIds.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum workspace encontrado.</p>
          )}
          {orderedGroupIds.map((groupId) => {
            const wsInGroup = groupedWorkspaces[groupId] || [];
            if (wsInGroup.length === 0) return null;
            const isOpen = expandedGroups.has(groupId);
            const group = groups.find((g) => g.id === groupId);
            const activeInGroup = wsInGroup.filter((ws) => localPerms[ws.id]?.can_view).length;

            return (
              <Collapsible key={groupId} open={isOpen} onOpenChange={() => toggleGroup(groupId)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    {group && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color || "#6B7280" }} />
                    )}
                    <span className="font-medium">{getGroupName(groupId)}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {activeInGroup}/{wsInGroup.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 ml-4 mt-1">
                  {wsInGroup.map((ws) => {
                    const perm = localPerms[ws.id] || { can_view: false, can_edit: false, can_delete: false };
                    const hasAccess = perm.can_view;
                    return (
                      <div
                        key={ws.id}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                          hasAccess
                            ? "border-primary/20 bg-primary/5"
                            : "border-border/50 hover:border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: ws.color || "#7C3AED" }}
                          />
                          <span className="text-sm font-medium truncate">{ws.name}</span>
                          {ws.type && (
                            <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                              {ws.type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <Checkbox
                              checked={perm.can_view}
                              onCheckedChange={() => togglePerm(ws.id, "can_view")}
                            />
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <Checkbox
                              checked={perm.can_edit}
                              onCheckedChange={() => togglePerm(ws.id, "can_edit")}
                              disabled={!perm.can_view}
                            />
                            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <Checkbox
                              checked={perm.can_delete}
                              onCheckedChange={() => togglePerm(ws.id, "can_delete")}
                              disabled={!perm.can_edit}
                            />
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {/* Save */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Permissões"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
