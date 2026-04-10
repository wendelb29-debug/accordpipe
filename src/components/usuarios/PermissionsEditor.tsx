import { useState, useEffect } from "react";
import { Search, Shield, ShieldCheck, ShieldX, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERMISSION_MODULES, ALL_PERMISSION_KEYS, DATA_SCOPE_LABELS, type DataScope } from "@/lib/permissions";
import { useUserPermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";

interface PermissionsEditorProps {
  userId: string;
  isCeoOrMaster?: boolean;
  onClose?: () => void;
}

interface LocalPerm {
  granted: boolean;
  data_scope: DataScope;
}

export function PermissionsEditor({ userId, isCeoOrMaster, onClose }: PermissionsEditorProps) {
  const { toast } = useToast();
  const {
    roleDefaults,
    customPerms,
    hasCustom,
    loading,
    userRole,
    getEffectivePermission,
    getEffectiveScope,
    saveCustomPermissions,
    clearCustomPermissions,
  } = useUserPermissions(userId);

  const [searchTerm, setSearchTerm] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [localPerms, setLocalPerms] = useState<Record<string, LocalPerm>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCustomMode(hasCustom);
    const perms: Record<string, LocalPerm> = {};
    ALL_PERMISSION_KEYS.forEach(key => {
      perms[key] = {
        granted: getEffectivePermission(key),
        data_scope: getEffectiveScope(key),
      };
    });
    setLocalPerms(perms);
  }, [hasCustom, roleDefaults, customPerms]);

  if (isCeoOrMaster) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium text-foreground">Acesso Total</p>
          <p className="text-sm text-muted-foreground">
            Usuários CEO/Master possuem todas as permissões e não podem ser restringidos.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleToggle = (key: string) => {
    setLocalPerms(prev => ({
      ...prev,
      [key]: { ...prev[key], granted: !prev[key]?.granted },
    }));
  };

  const handleScopeChange = (key: string, scope: DataScope) => {
    setLocalPerms(prev => ({
      ...prev,
      [key]: { ...prev[key], data_scope: scope },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (customMode) {
        await saveCustomPermissions(localPerms);
        toast({ title: "Permissões salvas", description: "As permissões customizadas foram aplicadas." });
      } else {
        await clearCustomPermissions();
        toast({ title: "Permissões resetadas", description: "Usando permissões padrão do perfil." });
      }
      onClose?.();
    } catch {
      toast({ title: "Erro", description: "Não foi possível salvar as permissões.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    const perms: Record<string, LocalPerm> = {};
    ALL_PERMISSION_KEYS.forEach(key => {
      const defaultEntry = roleDefaults[key];
      perms[key] = {
        granted: !!defaultEntry,
        data_scope: defaultEntry?.data_scope || "own",
      };
    });
    setLocalPerms(perms);
    setCustomMode(false);
  };

  const filteredModules = PERMISSION_MODULES.map(module => ({
    ...module,
    permissions: module.permissions.filter(p =>
      p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.label.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(m => m.permissions.length > 0);

  const grantedCount = ALL_PERMISSION_KEYS.filter(k => localPerms[k]?.granted).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">Permissões</span>
          <Badge variant="secondary" className="text-xs">
            {grantedCount}/{ALL_PERMISSION_KEYS.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="custom-mode" className="text-sm text-muted-foreground">
            Personalizar
          </Label>
          <Switch
            id="custom-mode"
            checked={customMode}
            onCheckedChange={(checked) => {
              setCustomMode(checked);
              if (!checked) handleResetToDefaults();
            }}
          />
        </div>
      </div>

      {!customMode && (
        <div className="p-3 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
          Usando permissões padrão do perfil <Badge variant="outline" className="ml-1">{userRole}</Badge>. 
          Ative "Personalizar" para ajustar individualmente.
        </div>
      )}

      {customMode && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar permissões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Modules */}
          <Accordion type="multiple" className="space-y-2" defaultValue={PERMISSION_MODULES.map(m => m.key)}>
            {filteredModules.map(module => {
              const ModIcon = module.icon;
              const moduleGranted = module.permissions.filter(p => localPerms[p.key]?.granted).length;
              return (
                <AccordionItem key={module.key} value={module.key} className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <ModIcon className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{module.label}</span>
                      <Badge variant={moduleGranted === module.permissions.length ? "default" : "secondary"} className="text-xs">
                        {moduleGranted}/{module.permissions.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="space-y-3">
                      {module.permissions.map(perm => (
                        <div key={perm.key} className="flex items-center justify-between py-1 gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {localPerms[perm.key]?.granted ? (
                              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <ShieldX className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{perm.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{perm.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {perm.scopable && localPerms[perm.key]?.granted && (
                              <Select
                                value={localPerms[perm.key]?.data_scope || "own"}
                                onValueChange={(val) => handleScopeChange(perm.key, val as DataScope)}
                              >
                                <SelectTrigger className="h-7 w-24 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.entries(DATA_SCOPE_LABELS) as [DataScope, string][]).map(([scope, label]) => (
                                    <SelectItem key={scope} value={scope} className="text-xs">{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Switch
                              checked={localPerms[perm.key]?.granted || false}
                              onCheckedChange={() => handleToggle(perm.key)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* Reset button */}
          <Button variant="ghost" size="sm" onClick={handleResetToDefaults} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restaurar padrão do perfil
          </Button>
        </>
      )}

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
