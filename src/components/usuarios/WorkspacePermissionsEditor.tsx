import { useState, useEffect } from "react";
import { Search, Eye, Pencil, Trash2, CheckSquare, XSquare, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId: string;
  isCeoOrMaster?: boolean;
  onClose?: () => void;
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

export function WorkspacePermissionsEditor({ userId, isCeoOrMaster, onClose }: Props) {
  const companyId = useActiveCompanyId();
  const { permissions, loading: permsLoading, savePermissions } = useUserWorkspacePermissions(userId, companyId);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [localPerms, setLocalPerms] = useState<Record<string, LocalPerm>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("id, name, color, type, group_id")
        .eq("servidor_id", companyId)
        .order("name");
      setWorkspaces((data || []) as WorkspaceItem[]);
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

  if (isCeoOrMaster) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
        <Building2 className="h-5 w-5 text-primary" />
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
      // If enabling edit or delete, also enable view
      if ((field === "can_edit" || field === "can_delete") && updated[field]) {
        updated.can_view = true;
      }
      // If disabling view, disable all
      if (field === "can_view" && !updated.can_view) {
        updated.can_edit = false;
        updated.can_delete = false;
      }
      return { ...prev, [wsId]: updated };
    });
  };

  const selectAll = () => {
    const perms: Record<string, LocalPerm> = {};
    workspaces.forEach((ws) => {
      perms[ws.id] = { can_view: true, can_edit: true, can_delete: true };
    });
    setLocalPerms(perms);
  };

  const clearAll = () => {
    const perms: Record<string, LocalPerm> = {};
    workspaces.forEach((ws) => {
      perms[ws.id] = { can_view: false, can_edit: false, can_delete: false };
    });
    setLocalPerms(perms);
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

  const filtered = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grantedCount = Object.values(localPerms).filter((p) => p.can_view).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">Workspaces Permitidos</span>
          <Badge variant="secondary" className="text-xs">
            {grantedCount}/{workspaces.length}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll} className="text-xs gap-1">
            <CheckSquare className="h-3.5 w-3.5" />
            Todos
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll} className="text-xs gap-1">
            <XSquare className="h-3.5 w-3.5" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar workspace..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Visualizar</span>
        <span className="flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Editar</span>
        <span className="flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Excluir</span>
      </div>

      {/* Workspace List */}
      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
        {filtered.map((ws) => {
          const perm = localPerms[ws.id] || { can_view: false, can_edit: false, can_delete: false };
          return (
            <div
              key={ws.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: ws.color || "#7C3AED" }}
                />
                <span className="text-sm font-medium truncate">{ws.name}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={perm.can_view}
                    onCheckedChange={() => togglePerm(ws.id, "can_view")}
                  />
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={perm.can_edit}
                    onCheckedChange={() => togglePerm(ws.id, "can_edit")}
                    disabled={!perm.can_view}
                  />
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={perm.can_delete}
                    onCheckedChange={() => togglePerm(ws.id, "can_delete")}
                    disabled={!perm.can_view}
                  />
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </label>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum workspace encontrado.</p>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
  );
}
